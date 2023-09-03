import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import Project from '@/schemas/Project';
import User from '@/schemas/User';
import Dataset from '@/schemas/Dataset';
import Model from "@/schemas/Model";
import Template from "@/schemas/Template";

import OpenAI from "openai";

const createError = require('http-errors');
const mongoose = require('mongoose');
const csv = require('csvtojson');
const tmp = require('tmp');
const fs = require('fs');
const ObjectId = require('mongodb').ObjectId;

const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const client = new S3Client({ region: REGION });

async function downloadFile(data, filename) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filename);
    data.forEach(value => writeStream.write(`${JSON.stringify(value)}\n`));
    writeStream.on('finish', () => {
      writeStream.close();
      resolve();
    });
    writeStream.on('error', (err) => {
      console.error('There was an error writing the file:', err);
      reject(err);
    });
    writeStream.end();
  });
}

function deleteTemporaryFile(filename) {
  fs.unlink(filename, (err) => {
    if (err) {
      console.error('Error deleting temporary file:', err);
    } else {
      console.log('Temporary file deleted successfully');
    }
  });
}

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

  // Don't return a status twice
  let newModelId = null;
  try {
    console.log("Rerunning training for " + request.body.modelId);
    const modelId = request.body.modelId;

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    // Configure openai with user API key
    const openai = new OpenAI({
      organization: user.organization,
      apiKey: user.openAiKey
    });

    let model = await Model
      .aggregate([
        {
          $match: { _id: new ObjectId(modelId), userId: user._id }
        },
        {
          $lookup: {
            from: "datasets",
            localField: "datasetId",
            foreignField: "_id",
            as: "dataset"
          }
        },
        {
          $lookup: {
            from: "templates",
            localField: "templateId",
            foreignField: "_id",
            as: "template"
          }
        },
        {
          $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "project"
          }
        },
        {
          $unwind: { path: "$dataset", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$template", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$project", preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            _id: "$_id",
            name: "$name",
            datasetId: "$datasetId",
            providerData: "$providerData",
            templateId: "$templateId",
            datasetName: "$dataset.name",
            datasetTrainFileName: "$dataset.trainFileName",
            datasetValFileName: "$dataset.valFileName",
            templateString: "$template.templateString",
            stopSequence: "$template.stopSequence",
            outputColumn: "$template.outputColumn",
            classMap: "$template.classMap",
            classes: "$template.classes",
            projectType: "$project.type",
            description: "$description",
            provider: "$provider",
            timeCreated: "$timeCreated",
            status: "$status",
            modelArchitecture: "$modelArchitecture",
          }
        }
    ]);
    model = model[0];
    if (!model) {
      throw createError(400,'Model not found');
    }
    if (model.status === "succeeded") {
      throw createError(400,"Model already trained");
    }
    newModelId = model._id;
    await Model.findByIdAndUpdate(
      model._id,
      {
        status: "preparing",
      }
    );

    const regex = /{{.*}}/g;
    const matches = model.templateString.match(regex);
    const matchesStrings = [...new Set(matches.map(m => m.substring(2, m.length - 2)))];

    let template = {};

    const trainFileName = model.datasetTrainFileName;
    const valFileName = model.datasetValFileName;
    let valFilePresent = (valFileName && valFileName !== undefined);

    // Download files from S3
    const params = {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + trainFileName,
    }

    const command = new GetObjectCommand(params);
    const s3Response = await client.send(command);
    const stream = s3Response.Body;
    const trainJson = await csv({trim:false}).fromStream(stream);

    let valJson = {};
    if (valFilePresent) {
      const params = {
        Bucket: S3_BUCKET,
        Key: 'raw_data/' + valFileName,
      }

      const command = new GetObjectCommand(params);
      const s3Response = await client.send(command);
      const stream = s3Response.Body;
      valJson = await csv({trim:false}).fromStream(stream);
    }

    let classes = [];

    const templateTransform = (row) => {
      if (model.projectType === "classification") {
        classes.push(row[model.outputColumn]);
      }
      let prompt = model.templateString;
      matches.forEach((match) => {
        prompt = prompt.replace(match, row[match.replace('{{','').replace('}}','')]);
      });
      return {prompt: prompt, completion: row[model.outputColumn] + model.stopSequence};
    }

    let trainData = trainJson.map((row) => {
      return templateTransform(row);
    });

    let valData = {};
    if (valFilePresent) {
      valData = valJson.map((row) => {
        return templateTransform(row);
      });
    }

    if (model.modelArchitecture === "gpt-3.5-turbo-0613") {
      trainData = trainData;
      trainData = trainData.map((row) => {
        return {messages: [{role: 'user', content: row.prompt},
                           {role: 'assistant', content: row.completion}]};
      });
      if (valFilePresent) {
        valData = valData;
        valData = valData.map((row) => {
          return {messages: [{role: 'user', content: row.prompt},
                             {role: 'assistant', content: row.completion}]};
        });
      }
    }

    const trainFileJsonl = tmp.tmpNameSync({ postfix: '.jsonl' });
    const valFileJsonl = tmp.tmpNameSync({ postfix: '.jsonl' });

    await downloadFile(trainData, trainFileJsonl);
    if (valFilePresent) {
      await downloadFile(valData, valFileJsonl);
    }

    console.log("Downloaded files");
    const trainResponse = await openai.files.create({
      file: fs.createReadStream(trainFileJsonl),
      purpose: "fine-tune",
    });
    deleteTemporaryFile(trainFileJsonl);

    let dataset;
    if (valFilePresent) {
      const valResponse = await openai.files.create({
        file: fs.createReadStream(valFileJsonl),
        purpose: "fine-tune",
      });
      deleteTemporaryFile(valFileJsonl);
      dataset = await Dataset.findByIdAndUpdate(model.datasetId,
        {openaiData: {trainFile: trainResponse.id, valFile: valResponse.id}}, {new: true});
    } else {
      dataset = await Dataset.findByIdAndUpdate(model.datasetId, {openaiData: {trainFile: trainResponse.id}}, {new: true});
    }
    response.status(200).send();

    await new Promise(r => setTimeout(r, 10000));

    console.log("Done");
    console.log(valFilePresent);

    let finetuneRequest = {
      training_file: dataset.openaiData.trainFile,
      model: model.modelArchitecture,
    };
    if (valFilePresent) {
      finetuneRequest.validation_file = dataset.openaiData.valFile;
    }

    let counter = 0;
    const interval = 5000;
    const maxCount = 720;  // 1 hour
    let train = -1;
    const intervalId = setInterval(async () => {
      if (counter < maxCount) {
        counter++;
        const file = await openai.files.retrieve(dataset.openaiData.trainFile);
        if (file.status === "processed" && train === -1) {
          train = counter + 6;  // Wait before training
        }
        if (file.status === "processed" && counter === train) {
          clearInterval(intervalId);
          console.log(file);
          console.log("File processed");

          // Create finetune
          finetuneRequest = {...finetuneRequest, hyperparameters: model.providerData.hyperParams};
          console.log(finetuneRequest);
          try {
            const finetuneResponse = await openai.fineTuning.jobs.create(finetuneRequest);
            console.log(finetuneResponse);

            await Model.findByIdAndUpdate(
              model._id,
              {
                status: "training",
                providerData: {
                  finetuneId: finetuneResponse.id,
                  hyperParams: model.providerData.hyperParams,
                },
              }
            );
          } catch (error) {
            console.log(error);
            await Model.findByIdAndUpdate(newModelId, {
              status: "failed",
              errorMessage: error.error.message,
            })
          }
        }
      } else {
        clearInterval(intervalId);
        await Model.findByIdAndUpdate(newModelId, {status: "failed"})
      }
    }, interval);
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      error = createError(400, 'Another model with the same name exists in this project');
      response.status(error.status).json({ error: error.message });
    } else {
      if (newModelId) {
        await Model.findByIdAndUpdate(newModelId, {status: "failed"})
      }
    }
  }
}

