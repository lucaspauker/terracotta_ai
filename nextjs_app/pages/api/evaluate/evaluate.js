import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
import AWS from 'aws-sdk'

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const csv = require('csvtojson');
const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;

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
    const modelName = request.body.modelName;
    const projectName = request.body.projectName;
    const metrics = request.body.metrics;

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

    // First, get the dataset and model from the database
    const dataset = await db
      .collection("datasets")
      .findOne({userId: userId, name: datasetName});
    if (!dataset) {
      response.status(400).json({ error: 'Dataset not found' });
      return;
    }

    const model = await db
      .collection("models")
      .findOne({userId: userId, name: modelName});
    if (!model) {
      response.status(400).json({ error: 'Model not found' });
      return;
    }

    // Check if name already exists
    const prev = await db
      .collection("evaluations")
      .findOne({name: name, projectId: project._id});
    if (prev) {
      response.status(400).json({error:"Evaluation name already exists, pick a unique name."});
      return;
    }

    await db
      .collection("evaluations")
      .insertOne({
          name: name,
          description: description,
          datasetId: dataset._id,
          projectId: project._id,
          modelId: model._id,
          userId: user._id,
          metrics: metrics,
          metricResults: null,
          trainingEvaluation: false,
          status: "evaluating",
          timeCreated: Date.now(),
        }).then(res => {
          newEvaluationId = res.insertedId;
        });
    response.status(200).send();
    didReturn = true;

    // Next, call inference for every example
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

    console.log("Starting to query OpenAI");
    const requests = json_output.map((row) =>
      openai.createCompletion({
        model: model.providerData.modelId,
        prompt: row.prompt + "\n\n###\n\n",
        max_tokens: project.type === "classification" ? 10 : 100,
        temperature: 0,
        stop: '$$$',
      })
    );

    const results = await Promise.all(requests);
    console.log("Retrieved results from OpenAI");

    results.map((completion) => {
      completions.push(completion.data.choices[0].text.trim());
    });

    let metricResults = {}
    if (project.type === "classification") {
      const total = completions.length;
      let tp = 0, fp = 0, tn = 0, fn = 0;
      const positiveClass = dataset.classes[0];

      for (let i = 0; i < total; i++) {
        const prediction = completions[i];
        const actual = json_output[i].completion;
        if (actual === positiveClass) {
          if (prediction === positiveClass) {
            tp ++;
          } else {
            fn ++;
          }
        } else {
          if (prediction === positiveClass) {
            fp ++;
          } else {
            tn ++;
          }
        }
      }

      for (let i = 0; i < metrics.length; i++) {
        if (metrics[i] === "accuracy") {
          metricResults["accuracy"] = (tp + tn)/(total);
        }
        if (metrics[i] === "precision") {
          metricResults["precision"] = (tp)/(tp + fp);
        }
        if (metrics[i] === "recall") {
          metricResults["recall"] = (tp)/(tp + fn);
        }
        if (metrics[i] === "f1") {
          const precision = (tp)/(tp + fp);
          const recall = (tp)/(tp + fn);
          metricResults["f1"] = (2*precision*recall)/(precision + recall);
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
          "reference": json_output,
        }),
      });
      const responseData = await response.json();
      const tempMetricResults = responseData.metric_results;
      for (let i = 0; i < metrics.length; i++) {
        if (metrics[i] in tempMetricResults) {
          metricResults[metrics[i]] = tempMetricResults[metrics[i]];
        } else {
          response.status(400).json({ error: 'Metric type not supported' });
          return;
        }
      }
    } else {
      response.status(400).json({ error: 'Project type not supported' });
      return;
    }


    await db
      .collection("evaluations")
      .updateOne({_id: newEvaluationId}, {$set: {
          metricResults: metricResults,
          status: "succeeded",
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

