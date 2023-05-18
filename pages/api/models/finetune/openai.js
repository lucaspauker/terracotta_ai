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
    const writeStream = fs.createWriteStream('jsonl_data/' + filename);
    data.forEach(value => writeStream.write(`${JSON.stringify(value)}\n`));
    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err) => {
      console.error(`There is an error writing the file`)
  });
    writeStream.end();
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

    await mongoClient.connect();
    const db = mongoClient.db("sharpen");

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
    }

    let dataset = await db
      .collection("datasets")
      .findOne({userId: userId, name: datasetName});

    // Only download from S3 and upload to openai once

    let valFilePresent = false;

    // TODO: implement openaiuploaded logic, retrieve from mongo if it's already been uploaded,
    // update usage of classes variable with this.
    const openaiUploaded = false;
    const regex = /{{.*}}/g;
    const matches = templateString.match(regex);
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
    if (!openaiUploaded) {

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
      }

      await db
      .collection("templates")
      .insertOne(template);
      
      
      const trainFileJsonl = trainFileName.split('.')[0] + '.jsonl'
      const valFileJsonl = valFileName.split('.')[0] + '.jsonl'
      await downloadFile(trainData, trainFileJsonl);
      if (valFilePresent) {
        await downloadFile(valData, valFileJsonl);
      }

      const trainResponse = await openai.createFile(
        fs.createReadStream('jsonl_data/' + trainFileJsonl),
        "fine-tune"
      );
      console.log(trainResponse.data);

      if (valFilePresent) {
        const valResponse = await openai.createFile(
          fs.createReadStream('jsonl_data/' + valFileJsonl),
          "fine-tune"
        );
        console.log(valResponse.data);
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
          classification_positive_class: classes[0],
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
      if (valFilePresent) finetuneRequest.validation_file = dataset.openaiData.valFile;
    } else {
      response.status(400).json({ error: 'Only classification and generation are supported' });
      return;
    }

    // Create finetune
    finetuneRequest = {...finetuneRequest,...hyperParams};
    const finetuneResponse = await openai.createFineTune(finetuneRequest);

    console.log(finetuneResponse.data)

    const d = await db
      .collection("models")
      .insertOne({
          name: modelName,
          description: description,
          provider: provider,
          modelArchitecture: modelArchitecture,
          status: "training",
          datasetId: dataset._id,
          projectId: project._id,
          userId: userId,
          providerData: {
            finetuneId: finetuneResponse.data.id,
            hyperParams: hyperParams,
          },
          templateId: template._id,
          timeCreated: Date.now(),
        });
    
    console.log(d);

    response.status(200).send();

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}

