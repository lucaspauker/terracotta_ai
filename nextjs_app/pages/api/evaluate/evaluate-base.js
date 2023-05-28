import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
import AWS from 'aws-sdk'

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const csv = require('csvtojson');
const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const ObjectId = require('mongodb').ObjectId;

const { Configuration, OpenAIApi } = require("openai");

AWS.config.update({
  accessKeyId: process.env.PUBLIC_S3_ACCESS_KEY,
  secretAccessKey: process.env.PUBLIC_S3_SECRET_ACCESS_KEY
});
const myBucket = new AWS.S3({
  params: { Bucket: S3_BUCKET },
  region: REGION,
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  let didReturn = false;
  let newEvaluationId;
  await mongoClient.connect();
  const db = mongoClient.db("sharpen");

  try {
    const name = request.body.name;
    const description = request.body.description;
    const datasetName = request.body.datasetName;
    const projectName = request.body.projectName;
    const completionName = request.body.completionName;
    const metrics = request.body.metrics;
    const templateString = request.body.templateString;
    const templateData = request.body.templateData;
    const outputColumn = request.body.outputColumn;
    const stopSequence = request.body.stopSequence;

    const user = await db
      .collection("users")
      .findOne({email: session.user.email});
    const userId = user._id;

    const configuration = new Configuration({
      apiKey: user.openAiKey,
    });
    const openai = new OpenAIApi(configuration);

    const project = await db
      .collection("projects")
      .findOne({userId: userId, name: projectName});
    if (!project) {
      response.status(400).json({ error: 'Project not found' });
      return;
    }

    const prev = await db
      .collection("evaluations")
      .findOne({name: name, projectId: project._id});
    if (prev) {
      response.status(400).json({error:"Evaluation name already exists, pick a unique name."});
      return;
    }

    // First, get the dataset and model from the database
    const dataset = await db
      .collection("datasets")
      .findOne({userId: userId, name: datasetName});
    if (!dataset) {
      response.status(400).json({ error: 'Dataset not found' });
      return;
    }

    const providerModel = await db
      .collection("providerModels")
      .findOne({completionName: completionName});

    console.log(providerModel);

    await db
      .collection("evaluations")
      .insertOne({
          name: name,
          description: description,
          datasetId: dataset._id,
          projectId: project._id,
          providerModelId: providerModel._id,
          userId: user._id,
          templateId: null,
          metrics: metrics,
          metricResults: null,
          trainingEvaluation: false,
          status: "evaluating",
          timeCreated: Date.now(),
        }).then(res => {
          newEvaluationId = res.insertedId;
        });
    response.status(200).end();
    didReturn = true;

    const regex = /{{.*}}/g;
    const matches = templateString.match(regex);
    const matchesStrings = [...new Set(matches.map(m => m.substring(2, m.length - 2)))];

    let classes = new Set();

    const templateTransform = (templateString, finetuneInputData) => {
        const regex = /{{.*}}/g;
        const matches = templateString.match(regex);
        if (project.type === "classification") {
            classes.add(finetuneInputData[outputColumn]);
        }

        let result = templateString;
        matches.forEach((match) => {
          const strippedMatch = match.substring(2, match.length - 2);
          if (strippedMatch in finetuneInputData) {
            result = result.replace(match, finetuneInputData[strippedMatch]);
          } else {
            result = result.replace(match, '');
          }
        });
        return result;
    }

    let fileName;
    if (dataset.valFileName) {
      fileName = dataset.valFileName;
    } else {
      fileName = dataset.trainFileName;
    }
    const params = {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + fileName,
    };
    const stream = myBucket.getObject(params).createReadStream();
    const json_output = await csv().fromStream(stream);

    let completions = [];

    let requests = [];
    let references = [];
    for (let i=0; i<json_output.length; i++) {
      const r = openai.createCompletion({
        model: completionName,
        prompt: templateTransform(templateString, json_output[i]),
        max_tokens: project.type === "classification" ? 10 : 100,
        temperature: 0,
        stop: stopSequence,
      });
      requests.push(r);
      references.push(json_output[i][outputColumn]);
    }

    const results = await Promise.all(requests);
    console.log("Retrieved results from OpenAI");

    const templateId = new ObjectId();
    classes = Array.from(classes);
    const template = {
        _id: templateId,
        templateString: templateString,
        templateData: templateData,
        outputColumn: outputColumn,
        datasetId: dataset._id,
        classes: project.type ===  "classification" ? classes : null,
        stopSequence: stopSequence,
        fields: matchesStrings,
    }

    await db
      .collection("templates")
      .insertOne(template);

    results.map((completion) => {
      completions.push(completion.data.choices[0].text.trim());
    });

    let metricResults = {}
    if (project.type === "classification") {
      // Call flask app
      let url = process.env.FLASK_URL + "/evaluate_classification";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "completions": completions,
          "references": references,
          "classes": template.classes,
        }),
      });
      const responseData = await response.json();
      const tempMetricResults = responseData.metric_results;
      for (let i = 0; i < metrics.length; i++) {
        if (metrics[i] in tempMetricResults) {
          metricResults[metrics[i]] = tempMetricResults[metrics[i]];
        } else {
          throw new Error("Metric type not supported");
        }
      }
    } else if (project.type === "generative") {
      // Call flask app
      let url = process.env.FLASK_URL + "/evaluate_nlp";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "completions": completions,
          "references": references,
          "metrics": metrics,
        }),
      });
      const responseData = await response.json();
      const tempMetricResults = responseData.metric_results;
      for (let i = 0; i < metrics.length; i++) {
        if (metrics[i] in tempMetricResults) {
          metricResults[metrics[i]] = tempMetricResults[metrics[i]];
        } else {
          throw new Error("Metric type not supported");
        }
      }
    } else {
        throw new Error("Project type not supported");
    }

    await db
      .collection("evaluations")
      .updateOne({_id: newEvaluationId}, {$set: {
          metricResults: metricResults,
          status: "succeeded",
          templateId: templateId,
        }});


  } catch (e) {
    console.error(e);
    await db
      .collection("evaluations")
      .updateOne({_id: newEvaluationId}, {$set: {
        status: "failed",
        }});
    if (!didReturn) response.status(400).json({ error: e });
  }
}

