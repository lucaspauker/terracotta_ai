import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
import AWS from 'aws-sdk'

const path = require('path');

const mongoClient = new MongoClient(process.env.MONGODB_URI);

const { execSync } = require("child_process");

const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET;
const REGION = process.env.NEXT_PUBLIC_S3_REGION;

AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY,
  secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY
});
const myBucket = new AWS.S3({
  params: { Bucket: S3_BUCKET },
  region: REGION,
});

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const fs = require('fs');

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
    const modelArchitecture = request.body.architecture;
    const datasetName = request.body.dataset;
    const modelName = request.body.modelName;
    const projectName = request.body.projectName;

    console.log(request.body);

    await mongoClient.connect();
    const db = mongoClient.db("sharpen");

    const user = await db
      .collection("users")
      .findOne({email: session.user.email});

    const userId = user._id;

    const project = await db
      .collection("projects")
      .findOne({userId: userId, name: projectName});
    if (!project) {
      response.status(400).json({ error: 'Project not found' });
      return;
    }

    const dataset = await db
      .collection("datasets")
      .findOne({userId: userId, name: datasetName});

    //TODO: add logic for cases where we're training without a validation file

    const trainFileName = dataset.trainFileName
    const valFileName = dataset.valFileName

    const fileNames = [trainFileName, valFileName]

    for(var i=0; i < 2; i++){
      const fileName = fileNames[i]
      const params = {
        Bucket: S3_BUCKET,
        Key: 'raw_data/' + fileName,
      };

      await downloadFile(params, fileName)
    }

    // Use openai CLI tool to create train and validation jsonl files
    execSync(`python ${process.env.DIR_OPENAI_TOOLS}prepare_data_openai.py prepare_data --train_fname ${trainFileName} --val_fname ${valFileName}`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    // Upload files to openAI, need to modify this later and save into a new collection
    const preparedTrainFile = path.parse(trainFileName).name + "_prepared.jsonl";
    const preparedValFile = path.parse(valFileName).name + "_prepared.jsonl";

    console.log(preparedTrainFile)
    const trainResponse = await openai.createFile(
      fs.createReadStream(preparedTrainFile),
      "fine-tune"
    );
    console.log(trainResponse.data);

    const valResponse = await openai.createFile(
      fs.createReadStream(preparedValFile),
      "fine-tune"
    );
    console.log(valResponse.data);

    // Create finetune, need to remove hardcodes
    const finetuneResponse = await openai.createFineTune({
      training_file: trainResponse.data.id,
      validation_file: valResponse.data.id,
      compute_classification_metrics: true,
      classification_positive_class: " baseball",
      model: modelArchitecture,
    });

    console.log(finetuneResponse.data)

    const d = await db
      .collection("models")
      .insertOne({
          name: modelName,
          provider: provider,
          modelArchitecture: modelArchitecture,
          providerModelId: finetuneResponse.data.id,
          status: "training",
          datasetId: dataset._id,
          projectId: project._id,
          userId: userId,
        });
    console.log(d);

    response.status(200).send();

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}

async function downloadFile(params, fileName) {
  return new Promise((resolve, reject) => {
    const readStream = myBucket.getObject(params).createReadStream();

    console.log("Retreiving file: " + 'raw_data/' + fileName);
    console.log(params);

    const writeStream = fs.createWriteStream(fileName)
    readStream.pipe(writeStream).on("finish", () => resolve())
  });
}
