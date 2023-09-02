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
import ProviderModel from "@/schemas/ProviderModel";
import { stringify } from 'csv-stringify';

const createError = require('http-errors');
const mongoose = require('mongoose');

const csv = require('csvtojson');
const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const ObjectId = require('mongodb').ObjectId;

const OpenAI = require("openai");
const cohere = require('cohere-ai');

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
    const projectName = request.body.projectName;
    const completionName = request.body.completionName;
    const metrics = request.body.metrics;
    const templateString = request.body.templateString;
    const templateData = request.body.templateData;
    const outputColumn = request.body.outputColumn;
    const stopSequence = request.body.stopSequence;
    const maxTokens = Number(request.body.maxTokens);
    const temperature = Number(request.body.temperature);
    const classes = request.body.classes;

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

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

    let openai;

    if (providerModel.provider === "openai") {
      
      openai = new OpenAI({
        apiKey: user.openAiKey
      });
    } else {
      cohere.init(user.cohereKey);
    }

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
      parameters: {
        maxTokens: maxTokens,
        temperature: temperature,
      }
    })

    newEvaluationId = newEvaluation._id;

    response.status(200).send();
    didReturn = true;

    const regex = /{{.*}}/g;
    const matches = templateString.match(regex);
    const matchesStrings = [...new Set(matches.map(m => m.substring(2, m.length - 2)))];

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

    let requests = [];
    let references = [];
    let completions = [];
    let uploadData = [["Input","Label","Prediction"]];
    console.log(json_output.length);

    // Openai base models
    let results;
    if (providerModel.provider === "openai") {
      let inputPrompts = [];
      for (let i=0; i<json_output.length; i++) {
        const prompt = templateTransform(templateString, json_output[i]);
        inputPrompts.push(prompt);
        uploadData.push([prompt, json_output[i][outputColumn],''])
        references.push(json_output[i][outputColumn]);
      }
      results = await dispatchOpenAIRequests(openai, inputPrompts, completionName,
                                             maxTokens, temperature, stopSequence);
    } else { // Cohere models
      for (let i=0; i<json_output.length; i++) {
        const prompt = templateTransform(templateString, json_output[i]);
        const generateResponse = cohere.generate({
          prompt: templateTransform(templateString, json_output[i]),
          max_tokens: maxTokens,
          model: completionName.split('-')[1],
          temperature: temperature,
        });
        uploadData.push([prompt, json_output[i][outputColumn],''])
        requests.push(generateResponse);
        references.push(json_output[i][outputColumn]);
      }
      results = await Promise.all(requests);
    }

    console.log("Retrieved results from provider");

    let totalTokens = 0;
    let cost;

    if (providerModel.provider === "openai") {
      if (completionName === 'gpt-3.5-turbo' || completionName === 'gpt-4') {
        results.map((completion, i) => {
          const completionText = completion.data.choices[0].message.content.trim()
          completions.push(completionText);
          totalTokens += completion.data.usage.total_tokens;
          uploadData[i+1][2] = completionText;
        });
      } else {
        results.map((completion, i) => {
          const completionText = completion.data.choices[0].text.trim()
          completions.push(completionText);
          totalTokens += completion.data.usage.total_tokens;
          uploadData[i+1][2] = completionText;
        });
      }
      cost = totalTokens * providerModel.completionCost / 1000;
    } else {
      results.map((completion, i) => {
        const completionText = completion.body.generations[0].text.trim()
        completions.push(completionText);
        uploadData[i+1][2] = completionText;
      });
    }

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

    // move this to after evaluation?
    const template = await Template.create({
      templateString: templateString,
      templateData: templateData,
      outputColumn: outputColumn,
      datasetId: dataset._id,
      classes: project.type ===  "classification" ? classes : null,
      stopSequence: stopSequence,
      fields: matchesStrings,
    })

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
      cost: cost,
    })

  } catch (error) {
    console.error(error);
    // TODO: update so that this is only done if there was an error in calculating metrics
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

