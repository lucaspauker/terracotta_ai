import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
import AWS from 'aws-sdk'
import { Prompt } from "next/font/google";
import Data from "@/pages/data";
import { error } from "console";

const path = require('path');
const csv = require('csvtojson');
const streamify = require('stream-array');
const ObjectId = require('mongodb').ObjectId;
const tmp = require('tmp');

const mongoClient = new MongoClient(process.env.MONGODB_URI);

const { execSync } = require("child_process");

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

const { Configuration, OpenAIApi } = require("openai");

const fs = require('fs');

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

  await mongoClient.connect();
  const db = mongoClient.db("sharpen");

  // Don't return a status twice
  let didReturn = false;
  let newModelId = null;
  try {
    const provider = request.body.provider;
    const modelArchitecture = request.body.modelArchitecture;
    const datasetName = request.body.dataset;
    const modelName = request.body.modelName;
    const description = request.body.description;
    const projectName = request.body.projectName;
    let hyperParams = request.body.hyperParams;
    const templateString = request.body.templateString;
    const templateData = request.body.templateData;
    const outputColumn = request.body.outputColumn;
    const stopSequence = request.body.stopSequence;

    for (const [key, value] of Object.entries(hyperParams)){
      if (hyperParams[key] === null) {
        delete hyperParams[key];
      } else {
        hyperParams[key] = Number(value);
      }
    }

    const user = await db
      .collection("users")
      .findOne({email: session.user.email});
    const userId = user._id;

    // Configure openai with user API key
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
    } else if (project.type !== "generative" && project.type !== "classification") {
      response.status(400).json({ error: 'Only classification and generation are supported' });
      return;
    }

    let dataset = await db
      .collection("datasets")
      .findOne({userId: userId, name: datasetName});
    if (!dataset) {
      response.status(400).json({ error: 'Dataset not found' });
      return;
    }

    // Check if model already exists
    const prevModel = await db
      .collection("models")
      .findOne({name: modelName, projectId: project._id});
    if (prevModel) {
      response.status(400).json({error:"Model name already exists, pick a unique name."});
      return;
    }

    // Create model in db, then we will fill in provider data later
    await db
      .collection("models")
      .insertOne({
          name: modelName,
          description: description,
          provider: provider,
          modelArchitecture: modelArchitecture,
          status: "preparing",
          datasetId: dataset._id,
          projectId: project._id,
          userId: userId,
          providerData: {},
          timeCreated: Date.now(),
        }).then(res => {
          newModelId = res.insertedId;
        });
    response.status(200).send();
    didReturn = true;

    // Only download from S3 and upload to openai once
    let valFilePresent = false;

    // TODO: implement openaiuploaded logic, retrieve from mongo if it's already been uploaded,
    // update usage of classes variable with this.
    const openaiUploaded = false;
    const regex = /{{.*}}/g;
    const matches = templateString.match(regex);
    const matchesStrings = [...new Set(matches.map(m => m.substring(2, m.length - 2)))];
    let classes = [];

    const templateTransform = (row) => {
      if (project.type === "classification") {
        classes.push(row[outputColumn]);
      }
      let prompt = templateString;
      matches.forEach((match) => {
        prompt = prompt.replace(match, row[match.replace('{{','').replace('}}','')]);
      });
      return {prompt: prompt, completion: row[outputColumn] + stopSequence};
    }

    let template = {};

    //TODO: Check whether we've uploaded a dataset with this template before
    if (true || !openaiUploaded) {

      const trainFileName = dataset.trainFileName;
      const valFileName = dataset.valFileName;
      valFilePresent = valFileName && valFileName !== undefined;

      // Download files from S3

      const params = {
        Bucket: S3_BUCKET,
        Key: 'raw_data/' + trainFileName,
      }

      const stream = myBucket.getObject(params).createReadStream();
      const trainJson = await csv().fromStream(stream);
      let valJson = {};

      if (valFilePresent) {
        const params = {
          Bucket: S3_BUCKET,
          Key: 'raw_data/' + valFileName,
        }

        const stream = myBucket.getObject(params).createReadStream();
        valJson = await csv().fromStream(stream);
      }

      const trainData = trainJson.map((row) => {
        return templateTransform(row);
      });

      let valData = {};
      if (valFilePresent) {
        valData = valJson.map((row) => {
          return templateTransform(row);
        });
      }

      classes = Array.from(new Set(classes));

      template = {
        _id: new ObjectId(),
        templateString: templateString,
        templateData: templateData,
        outputColumn: outputColumn,
        datasetId: dataset._id,
        classes: classes.length > 1? classes : null,
        stopSequence: stopSequence,
        fields: matchesStrings,
      }

      await db
      .collection("templates")
      .insertOne(template);

      const trainFileJsonl = tmp.tmpNameSync({ postfix: '.jsonl' });
      const valFileJsonl = tmp.tmpNameSync({ postfix: '.jsonl' });

      await downloadFile(trainData, trainFileJsonl);
      if (valFilePresent) {
        await downloadFile(valData, valFileJsonl);
      }

      console.log("Downloaded files");

      const trainResponse = await openai.createFile(
        fs.createReadStream(trainFileJsonl),
        "fine-tune"
      );
      deleteTemporaryFile(trainFileJsonl);

      if (valFilePresent) {
        const valResponse = await openai.createFile(
          fs.createReadStream(valFileJsonl),
          "fine-tune"
        );
        deleteTemporaryFile(valFileJsonl);
        await db
          .collection("datasets")
          .updateOne({"_id":dataset._id},
          {$set: { "openaiData" : {"trainFile": trainResponse.data.id, "valFile": valResponse.data.id}}})
      } else {
        await db
          .collection("datasets")
          .updateOne({"_id":dataset._id},
          {$set: { "openaiData" : {"trainFile": trainResponse.data.id}}})
      }
      dataset = await db
      .collection("datasets")
      .findOne({"_id":dataset._id})
    }

    console.log("Done");

    let finetuneRequest = null;
    if (project.type === "classification") {
      if (classes.length <= 1) {
        response.status(400).json({ error: 'Dataset classes not specified' });
        return;
      } else if (classes.length === 2) {  // Binary classification
        finetuneRequest = {
          training_file: dataset.openaiData.trainFile,
          compute_classification_metrics: true,
          classification_positive_class: classes[0] + stopSequence,
          model: modelArchitecture,
        };
        if (valFilePresent) finetuneRequest.validation_file = dataset.openaiData.valFile;
      } else {  // Multiclass classification
        finetuneRequest = {
          training_file: dataset.openaiData.trainFile,
          compute_classification_metrics: true,
          classification_n_classes: classes.length,
          model: modelArchitecture,
        };
        if (valFilePresent) finetuneRequest.validation_file = dataset.openaiData.valFile;
      }
    } else if (project.type === "generative") {
      finetuneRequest = {
        training_file: dataset.openaiData.trainFile,
        model: modelArchitecture,
      };
    }

    // Create finetune
    finetuneRequest = {...finetuneRequest,...hyperParams};
    const finetuneResponse = await openai.createFineTune(finetuneRequest);

    const ret = await db
      .collection("models")
      .updateOne({_id: newModelId}, {$set: {
          status: "training",
          providerData: {
            finetuneId: finetuneResponse.data.id,
            hyperParams: hyperParams,
          },
          templateId: template._id,
          timeCreated: Date.now(),
        }});

    response.status(200).send();

  } catch (e) {
    console.error(e);
    if (newModelId) await db
      .collection("models")
      .updateOne({_id: newModelId}, {$set: {
          status: "failed",
        }});
    if (!didReturn) response.status(400).json({ error: e });
  }
}

