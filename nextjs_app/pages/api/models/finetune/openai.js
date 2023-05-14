import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
import AWS from 'aws-sdk'

const path = require('path');

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

async function downloadFile(params, fileName) {
  return new Promise((resolve, reject) => {
    const readStream = myBucket.getObject(params).createReadStream();

    console.log("Retreiving file: " + 'raw_data/' + fileName);
    console.log(params);

    const writeStream = fs.createWriteStream('jsonl_data/' + fileName)
    readStream.pipe(writeStream).on("finish", () => resolve())
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

    const dataset = await db
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
    if (!dataset.openaiData) {

      const trainFileName = dataset.trainFileName;
      const valFileName = dataset.valFileName;
      valFilePresent = valFileName && valFileName !== undefined;

      let fileNames;
      if (valFilePresent) {
        fileNames = [trainFileName, valFileName];
      } else {
        fileNames = [trainFileName];
      }

      for(var i=0; i < fileNames.length; i++){
        const fileName = fileNames[i]
        const params = {
          Bucket: S3_BUCKET,
          Key: 'raw_data/' + fileName,
        };

        await downloadFile(params, fileName)
      }

      // Use openai CLI tool to create train and validation jsonl files
      if (valFilePresent) {
        execSync(`python ${process.env.DIR_OPENAI_TOOLS}prepare_data_openai.py prepare_data --train_fname ${'jsonl_data/' + trainFileName} --val_fname ${'jsonl_data/' + valFileName} --task ${project.type}`, (error, stdout, stderr) => {
          if (error) {
              console.log(`error: ${error.message}`);
              response.status(400).json({ error: error.message });
              return;
          }
          if (stderr) {
              console.log(`stderr: ${stderr}`);
              response.status(400).json({ error: stderr });
              return;
          }
          console.log(`stdout: ${stdout}`);
        });
      } else {
        execSync(`python ${process.env.DIR_OPENAI_TOOLS}prepare_data_openai.py prepare_data --train_fname ${'jsonl_data/' + trainFileName} --task ${project.type}`, (error, stdout, stderr) => {
          if (error) {
              console.log(`error: ${error.message}`);
              response.status(400).json({ error: error.message });
              return;
          }
          if (stderr) {
              console.log(`stderr: ${stderr}`);
              response.status(400).json({ error: stderr });
              return;
          }
          console.log(`stdout: ${stdout}`);
        });
      }

      // Upload files to openAI, need to modify this later and save into a new collection
      const preparedTrainFile = 'jsonl_data/' + path.parse(trainFileName).name + "_prepared.jsonl";
      const trainResponse = await openai.createFile(
        fs.createReadStream(preparedTrainFile),
        "fine-tune"
      );

      if (valFilePresent) {
        const preparedValFile = 'jsonl_data/' + path.parse(valFileName).name + "_prepared.jsonl";
        const valResponse = await openai.createFile(
          fs.createReadStream(preparedValFile),
          "fine-tune"
        );
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
    }

    const uploadInfo = await db
      .collection("datasets")
      .findOne({"_id":dataset._id})


    let finetuneRequest = null;
    if (project.type === "classification") {
      if (dataset.classes.length <= 1) {
        response.status(400).json({ error: 'Dataset classes not specified' });
        return;
      } else if (dataset.classes.length === 2) {  // Binary classification
        finetuneRequest = {
          training_file: uploadInfo.openaiData.trainFile,
          compute_classification_metrics: true,
          classification_positive_class: " " + dataset.classes[0] + "$$$",
          model: modelArchitecture,
        };
        if (valFilePresent) finetuneRequest.validation_file = uploadInfo.openaiData.valFile;
      } else {  // Multiclass classification
        finetuneRequest = {
          training_file: uploadInfo.openaiData.trainFile,
          compute_classification_metrics: true,
          classification_n_classes: dataset.classes.length,
          model: modelArchitecture,
        };
        if (valFilePresent) finetuneRequest.validation_file = uploadInfo.openaiData.valFile;
      }
    } else if (project.type === "generative") {
      finetuneRequest = {
        training_file: uploadInfo.openaiData.trainFile,
        model: modelArchitecture,
      };
      if (valFilePresent) finetuneRequest.validation_file = uploadInfo.openaiData.valFile;
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
        }});
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

