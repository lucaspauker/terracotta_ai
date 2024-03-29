import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import {templateTransform} from '@/utils/template';
import {dispatchOpenAIRequests} from '@/utils/evaluate';

import User from '@/schemas/User';
import Project from '@/schemas/Project';
import Evaluation from '@/schemas/Evaluation';
import Dataset from "@/schemas/Dataset";
import Template from "@/schemas/Template";
import Model from "@/schemas/Model";
import ProviderModel from "@/schemas/ProviderModel";
import { stringify } from 'csv-stringify';

const createError = require('http-errors');
const mongoose = require('mongoose');
const OpenAI = require("openai");
const csv = require('csvtojson');

const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const client = new S3Client({ region: REGION });

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
    const modelName = request.body.modelName;
    const projectName = request.body.projectName;
    const metrics = request.body.metrics;
    const maxTokens = Number(request.body.maxTokens);
    const temperature = Number(request.body.temperature);

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    const openai = new OpenAI({
      apiKey: user.openAiKey
    });

    const project = await Project.findOne({userId: user._id, name: projectName});
    if (!project) {
      throw createError(400,'Project not found');
    }

    const prev = await Evaluation.findOne({name: name, projectId: project._id});
    if (prev) {
      throw createError(400,'Evaluation name already exists, pick a unique name.');
    }

    const dataset = await Dataset.findOne({userId: user._id, name: datasetName});
    if (!dataset) {
      throw createError(400,'Dataset not found')
    }

    const model = await Model.findOne({userId: user._id, name: modelName});
    if (!model) {
      throw createError(400,'Model not found');
    }

    const pmodel = await ProviderModel.findOne({finetuneName: model.modelArchitecture});
    if (!pmodel) {
      throw createError(400, 'Provider model not found');
    }

    const newEvaluation = await Evaluation.create({
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
      parameters: {
        maxTokens: maxTokens,
        temperature: temperature,
      }
    })
    newEvaluationId = newEvaluation._id;
    console.log(newEvaluation);

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
    const command = new GetObjectCommand(params);
    const s3Response = await client.send(command);
    const stream = s3Response.Body;
    const json_output = await csv({trim:false}).fromStream(stream);

    const template = await Template.findById(model.templateId);
    const templateString = template.templateString;

    let completions = [];
    let requests = [];
    let references = [];
    let uploadData = [["Input","Label","Prediction"]];

    let inputPrompts = [];
    for (let i=0; i<json_output.length; i++) {
      const prompt = templateTransform(templateString, json_output[i]);
      inputPrompts.push(prompt);
      uploadData.push([prompt, json_output[i][template.outputColumn],''])
      references.push(json_output[i][template.outputColumn]);
    }

    const results = await dispatchOpenAIRequests(openai, inputPrompts, model.providerData.modelId,
                                                 maxTokens, temperature, template.stopSequence, template.classMap);
    console.log("Retrieved results from OpenAI");

    let totalTokens = 0;
    results.map((completion, i) => {
      let completionText;
      if (model.modelArchitecture === "gpt-3.5-turbo-0613") {
        completionText = completion.choices[0].message.content;
      } else {
        completionText = completion.choices[0].text;
      }
      completions.push(completionText);
      totalTokens += completion.usage.total_tokens;
      uploadData[i+1][2] = completionText;
    });
    const cost = totalTokens * pmodel.finetuneCompletionCost / 1000;

    stringify(uploadData, async function (err, csvContent) {
      if (err) {
        console.log('Error converting data to CSV:', err);
        return;
      }

      const uploadParams = {
        Body: csvContent,
        Bucket: S3_BUCKET,
        Key: 'predictions/' + String(newEvaluationId) + '.csv',
      };

      const command = new PutObjectCommand(uploadParams);
      const data = await client.send(command);
      console.log('File uploaded successfully. File location:', data.Location);
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
      metricResults['confusion'] = tempMetricResults['confusion'];
      metricResults['class_distribution'] = tempMetricResults['class_distribution'];
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
          throw createError(400, "Metric not supported");
        }
      }
    } else {
      throw createError(400, "Project type not supported");
    }

    await Evaluation.findByIdAndUpdate(newEvaluationId, {
      metricResults: metricResults,
      status: "succeeded",
      cost: cost,
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

