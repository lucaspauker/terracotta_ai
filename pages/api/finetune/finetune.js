import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
import AWS from 'aws-sdk'

const mongo_client = new MongoClient(process.env.MONGODB_URI);

const { execSync } = require("child_process");

const csv = require('csvtojson');
// const client = new MongoClient(process.env.MONGODB_URI);
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
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {
    await mongo_client.connect();
    const db = mongo_client.db("sharpen");

    const provider = request.body.provider;
    const model = request.body.model;
    const dataset = request.body.dataset;

    // Need code for fetching dataset_id based on user_id and and dataset name
    // Temporarily hardcoding dataset_id for testing

    // Retrieve file from S3 and write to disk
    const dataset_id = "sport2_small.csv";

    const params = {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + dataset_id,
    };

    console.log("Retreiving file: " + 'raw_data/' + dataset_id);
    console.log(params);
    
    const stream = myBucket.getObject(params).createReadStream();

    const json_output = await csv().fromStream(stream);

    const train_file_name = "sport2_small.json";
    const val_file_name = "sport2_small_val.json";

    fs.writeFileSync(train_file_name, JSON.stringify(json_output))

    // Use openai CLI tool to create train and validation jsonl files 

    execSync(`prepare_data_openai.py prepare_data --train_fname ${train_file_name} --val_fname ${val_file_name} -q`, (error, stdout, stderr) => {
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

    const train_response = await openai.createFile(
      fs.createReadStream("sport2_small_prepared_train.jsonl"),
      "fine-tune"
    );
    console.log(train_response.data)

    const valid_response = await openai.createFile(
      fs.createReadStream("sport2_small_prepared_valid.jsonl"),
      "fine-tune"
    );
    console.log(valid_response.data)

    // Create finetune, need to remove hardcodes
    const finetune_response = await openai.createFineTune({
      training_file: train_response.data.id,
      validation_file: valid_response.data.id,
      compute_classification_metrics: true,
      classification_positive_class: " baseball",
      model: "ada",
    });

    console.log(finetune_response.data)

    response.status(200).send();

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
