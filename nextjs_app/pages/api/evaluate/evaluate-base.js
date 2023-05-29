import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import AWS from 'aws-sdk'

import User from '../../../schemas/User';
import Project from '../../../schemas/Project';
import Evaluation from '../../../schemas/Evaluation';
import Dataset from "../../../schemas/Dataset";
import Template from "../../../schemas/Template";
import ProviderModel from "../../../schemas/ProviderModel";

const createError = require('http-errors');
const mongoose = require('mongoose');

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

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    const configuration = new Configuration({
      apiKey: user.openAiKey,
    });
    const openai = new OpenAIApi(configuration);

    const project = await Project.findOne({userId: user._id, name: projectName});
    if (!project) {
      throw createError(400,'Project not found');
    }

    const prev = await Evaluation.findOne({name: name, projectId: project._id});

    if (prev) {
      throw createError(400,'Evaluation with this name already exists')
    }

    const dataset = await Dataset.findOne({userId: user._id, name: datasetName});

    if (!dataset) {
      throw createError(400,'Dataset not found');
    }

    const providerModel = await ProviderModel.findOne({completionName: completionName});

    console.log(providerModel);

    const newEvaluation = await Evaluation.create({
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
    })

    newEvaluationId = newEvaluation._id;

    response.status(200).send();
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

    classes = Array.from(classes);
    
    const template = await Template.create({
      templateString: templateString,
      templateData: templateData,
      outputColumn: outputColumn,
      datasetId: dataset._id,
      classes: project.type ===  "classification" ? classes : null,
      stopSequence: stopSequence,
      fields: matchesStrings,
    })

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
          // TODO: Not sure if we want to expose these errors or fall back to 500
          throw createError("Metric type not supported");
        }
      }
    } else {
        throw createError("Project type not supported");
    }

    await Evaluation.findByIdAndUpdate(newEvaluationId, {
      metricResults: metricResults,
      status: "succeeded",
      templateId: template._id,
    })

  } catch (error) {
    console.error(error);
    if (didReturn) {
      await Evaluation.findByIdAndUpdate(newEvaluationId, {
        status: "failed"
      })
    } else {
      if (!error.status) {
        error = createError(500, 'Error creating evaluation');
      }
      response.status(error.status).json({ error: error.message });
    } 
  }
}

