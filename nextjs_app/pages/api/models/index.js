import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import AWS from 'aws-sdk'

import Project from '../../../schemas/Project';  
import User from '../../../schemas/User';
import Model from "../../../schemas/Model";
import Evaluation from "../../../schemas/Evaluation";

const createError = require('http-errors');
const mongoose = require('mongoose');


const { Configuration, OpenAIApi } = require("openai");
const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;

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

  try {
    const projectName = request.body.projectName;

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    // Configure openai with user API key
    const configuration = new Configuration({
      apiKey: user.openAiKey,
    });
    const openai = new OpenAIApi(configuration);


    // Get project ID
    const project = await Project.findOne({userId: userId, name: projectName});
    if (!project) {
      throw createError(400,'Project not found');
    }

    const projectId = project._id;


    let models = await Model.find({userId: userId, projectId: projectId}).populate(
      {
        path: 'datasetId',
        select: 'name',
      }
    ).populate(
      {
        path: 'templateId',
        select: 'templateString fields classes'
      }
    );
    
    for (let i=0; i<models.length; i++) {
      let model = models[i];
      if (model.status === "imported") {
        continue;
      }

      if (model.status === "preparing") {
        models[i]["status"] = "preparing data";
      } else if (model.status !== "succeeded" && model.status !== "failed") {
        let finetuneResponse = await openai.retrieveFineTune(model.providerData.finetuneId);
        finetuneResponse = finetuneResponse.data;
        const events = finetuneResponse.events;

        if (finetuneResponse.status === "succeeded") {
          // Get the results file from OpenAI
          const resultsFile = finetuneResponse.result_files[0];
          const response = await openai.downloadFile(resultsFile.id);

          // Upload the results file to S3
          const resultsFileName = 'openai_results_data/' + model._id + '.csv';
          const openAiParams = {
            ACL: 'public-read',
            Body: response.data,
            Bucket: S3_BUCKET,
            Key: resultsFileName,
          };
          await myBucket.putObject(openAiParams).promise();

          // Get the last row of the response and create an evaluation
          const splitData = response.data.split(',');

          let makeEval = true;
          let metrics = [];
          let metricResults = [];
          if (project.type !== "classification") {
            // Generative tasks, do something here
            makeEval = false;
          } else if (model.templateId.classes.length === 2) {
            const accuracy = splitData[splitData.length - 6].replace(/\s+/g, '');
            const precision = splitData[splitData.length - 5].replace(/\s+/g, '');
            const recall = splitData[splitData.length - 4].replace(/\s+/g, '');
            const auprc = splitData[splitData.length - 3].replace(/\s+/g, '');
            const auroc = splitData[splitData.length - 2].replace(/\s+/g, '');
            const f1 = splitData[splitData.length - 1].replace(/\s+/g, '');
            metrics = ['accuracy', 'precision', 'recall', 'auprc', 'auroc', 'f1'];
            metricResults = {
              'accuracy': accuracy,
              'precision': precision,
              'recall': recall,
              'auprc': auprc,
              'auroc': auroc,
              'f1': f1
            };
          } else {
            const f1 = splitData[splitData.length - 1].replace(/\s+/g, '');
            const accuracy = splitData[splitData.length - 2].replace(/\s+/g, '');
            metrics = ['accuracy', 'weighted f1'];
            metricResults = {'accuracy': accuracy, 'weighted f1': f1};
          }

          // Create evaluation with training results
          if (makeEval) {
            console.log("Creating train eval");
            await Evaluation.create({
              name: model.name + " training evaluation",
              projectId: project._id,
              modelId: model._id,
              userId: user._id,
              metrics: metrics,
              metricResults: metricResults,
              trainingEvaluation: true,
            })
          }

          models[i]["status"] = "succeeded";
          models[i].providerData.modelId = finetuneResponse.fine_tuned_model;
          await Model.findByIdAndUpdate(model._id, {
            "status" : "succeeded",
            "providerData.modelId": finetuneResponse.fine_tuned_model,
            "providerData.resultsFileName": resultsFileName,
            "providerData.resultsFileId": finetuneResponse.result_files[0].id
          });

        } else if (finetuneResponse.status === "failed") {
          models[i]["status"] = "failed";
          await Model.findByIdAndUpdate(model._id, {
            "status" : "failed",
            "providerData.modelId": finetuneResponse.fine_tuned_model
          });
          continue;
        } else {
          // Check last event to update status
          const lastMessage = events[events.length - 1]['message'];
          if (events.length <= 3 || lastMessage.startsWith("Fine-tune is in the queue")
            || lastMessage.startsWith("Fine-tune costs")) {
            models[i]["status"] = "queued for training";
          } else if (lastMessage === "Fine-tune started") {
            models[i]["status"] = "training started";
          } else if (lastMessage.startsWith("Completed epoch")) {
            models[i]["status"] = lastMessage;
          } else if (lastMessage.startsWith("Uploaded")) {
            models[i]["status"] = "creating model endpoint";
          } else {
            models[i]["status"] = "";
          }
        }

        // Cost update
        if (!("cost" in models[i]) && events.length > 1) {
          const costEvent = events[1];
          if (costEvent["message"].startsWith("Fine-tune costs")) {
            const cost = parseFloat(costEvent["message"].split('$')[1]);
            models[i]["cost"] = cost;
            await Model.findByIdAndUpdate(model._id, {
              "cost" : cost
            });
          }
        }
      }
    }
    response.status(200).json(models);
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error listing models');
    }
    response.status(error.status).json({ error: error.message });
  }
}
