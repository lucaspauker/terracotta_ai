import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import Project from '@/schemas/Project';
import User from '@/schemas/User';
import Dataset from "@/schemas/Dataset";
import Model from "@/schemas/Model";
import Evaluation from "@/schemas/Evaluation";
import Template from "@/schemas/Template";
import ProviderModel from "@/schemas/ProviderModel";

const createError = require('http-errors');
const mongoose = require('mongoose');

const OpenAI = require("openai");

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

  try {
    const projectName = request.body.projectName;

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    // Configure openai with user API key
    const openai = new OpenAI({
      apiKey: user.openAiKey
    });

    // Get project ID
    const project = await Project.findOne({userId: userId, name: projectName});
    if (!project) {
      throw createError(400,'Project not found');
    }

    const projectId = project._id;

    // We only select name but reference id?
    let models = await Model.find({userId: userId, projectId: projectId})
      .populate(
        {
          path: 'datasetId',
          select: 'name valFileName',
        }
      ).populate(
        {
          path: 'templateId',
          select: 'templateString fields classes outputColumn stopSequence'
        }
      ).sort({timeCreated: -1});

    for (let i=0; i<models.length; i++) {
      let model = models[i];

      if (model.status === "imported") {
        continue;
      }

      if (model.status === "failed" || model.status === "succeeded") {
        continue;
      }

      if (model.status === "preparing") {
        models[i]["status"] = "preparing data";
      } else {
        let finetuneResponse;
        try {
          finetuneResponse = await openai.fineTuning.jobs.retrieve(model.providerData.finetuneId);
        } catch (error) {
          console.log(error);
          continue;
        }

        if (finetuneResponse.status === "failed") {
          models[i]["status"] = "failed";
          await Model.findByIdAndUpdate(model._id, {
            "status" : "failed",
            "providerData.modelId": finetuneResponse.fine_tuned_model
          });
          continue;
        }

        let makeEval = false;
        let metrics = [];
        let metricResults = [];
        const resultsFileName = 'openai_results_data/' + model._id + '.csv';
        if (finetuneResponse.status === "succeeded") {
          // Get the results file from OpenAI
          const resultsFile = finetuneResponse.result_files[0];
          const response = await openai.files.retrieveContent(resultsFile);

          // Upload the results file to S3 always, even for generative
          const openAiParams = {
            Body: response,
            Bucket: S3_BUCKET,
            Key: resultsFileName,
          };
          const uploadCommand = new PutObjectCommand(openAiParams);
          await client.send(uploadCommand);

          if (project.type === "classification") {
            // Get the last row of the response and create an evaluation
            const splitData = response.split(',');
            makeEval = true;

            if (model.datasetId.valFileName) {
              const train_accuracy = splitData[splitData.length - 3].replace(/\s+/g, '');
              const val_accuracy = splitData[splitData.length - 1].replace(/\s+/g, '');
              metrics = ['train_accuracy', 'val_accuracy'];
              metricResults = {
                'train_accuracy': train_accuracy,
                'val_accuracy': val_accuracy,
              };
            } else {
              const train_accuracy = splitData[splitData.length - 3].replace(/\s+/g, '');
              metrics = ['train_accuracy'];
              metricResults = {
                'train_accuracy': train_accuracy,
              };
            }
          }

          // Cost update
          if (true || (model.cost === undefined || !("cost" in model))) {
            // Get provider model
            const providerModel = await ProviderModel.findOne({completionName: model.modelArchitecture});
            if (!providerModel) {
              throw createError(400,'Provider model not found');
            }

            const cost = finetuneResponse.trained_tokens * providerModel["trainingCost"] / 1000;
            model["cost"] = cost;
            await Model.findByIdAndUpdate(model._id, {
              "cost" : cost
            });
          }

          // Create evaluation with training results
          if (makeEval && model.status !== "succeeded") {
            await Evaluation.create({
              name: model.name + " training evaluation",
              projectId: project._id,
              modelId: model._id,
              userId: user._id,
              metrics: metrics,
              metricResults: metricResults,
              trainingEvaluation: true,
              status: "succeeded",
              datasetId: model.datasetId._id,
            })
          }
          model["status"] = "succeeded";
          model.providerData.modelId = finetuneResponse.fine_tuned_model;
          await Model.findByIdAndUpdate(model._id, {
            "status" : "succeeded",
            "providerData.modelId": finetuneResponse.fine_tuned_model,
            "providerData.resultsFileName": resultsFileName,
            "providerData.resultsFileId": finetuneResponse.result_files[0].id
          });
        }
      }

      // TODO: cleanup
      // if (model.status === "succeeded" || model.status === "failed") {
      //   const dataset = await Dataset.findById(model.datasetId._id);
      //   try {
      //     await openai.files.del(dataset.openaiData.trainFile);
      //     if (dataset.openaiData.valFile) {
      //       await openai.files.del(dataset.openaiData.valFile);
      //     }
      //     console.log("Deleted file");
      //   } catch (error) {
      //     console.log(error);
      //   }
      // }
    }
    response.status(200).json(models);
  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error listing models');
    }
    response.status(error.status).json({ error: error.message });
  }
}
