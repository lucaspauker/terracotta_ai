import { IncomingForm } from 'formidable'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
import { promises as fs } from 'fs';
import AWS from 'aws-sdk'

const jsonexport = require('jsonexport');
const csv = require('csvtojson');
const client = new MongoClient(process.env.MONGODB_URI);
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

export const config = {
  api: {
    bodyParser: false,
  }
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  console.log("Creating dataset");

  try {
    await client.connect();
    const db = client.db("sharpen");

    const inputData = await new Promise((resolve, reject) => {
      const form = new IncomingForm()

      form.parse(request, (err, fields, files) => {
        if (err) return reject(err)
        resolve({ fields, files })
      })
    });

    const name = inputData.fields.name;
    const description = inputData.fields.description;
    const project_id = inputData.fields.project_id;
    const filename = inputData.fields.filename;
    const projectName = inputData.fields.projectName;
    const autoGenerateVal = inputData.fields.autoGenerateVal === 'true';
    let numValExamples = inputData.fields.numValExamples;

    const trainFileName = inputData.fields.trainFileName;
    const initialTrainFileName = inputData.fields.initialTrainFileName;
    let numTrainExamples = inputData.fields.numTrainExamples;
    let valFileName = inputData.fields.valFileName;
    let initialValFileName = inputData.fields.initialValFileName;

    if (name === '') {
      response.status(400).json({ error: 'Must specify a name' })
      return;
    }
    if (filename === '') {
      response.status(400).json({ error: 'Must provide a file' })
      return;
    }
    if (inputData.files.trainFileData === '') {
      response.status(400).json({ error: 'Must provide training data' })
      return;
    }

    let trainFileData = {};
    let valFileData = {};
    if (autoGenerateVal) {
      // FIRST case: Automatically generate validation data from training data
      console.log("Generating val file with this many entries: " + numValExamples);

      const inputTrainFileDataJson = await csv().fromFile(inputData.files.trainFileData.filepath);
      const shuffled = inputTrainFileDataJson.sort(() => 0.5 - Math.random());
      let outputValFileDataJson = shuffled.slice(0, numValExamples);
      let outputTrainFileDataJson = shuffled.slice(numValExamples, shuffled.length);

      // TODO: Parallelize this
      valFileData = await jsonexport(outputValFileDataJson);
      trainFileData = await jsonexport(outputTrainFileDataJson);

      numTrainExamples = outputTrainFileDataJson.length;
    } else if (initialValFileName === '') {
      // SECOND case: No validation file specified, so set entries to null in the database
      console.log("No validation file specified");

      let outputTrainFileDataJson = await csv().fromFile(inputData.files.trainFileData.filepath);
      trainFileData = await jsonexport(outputTrainFileDataJson);

      valFileName = null;
      initialValFileName = null;
    } else {
      // THIRD case: Both train and val files are specified
      console.log("Both train and validation files are specified");

      let outputTrainFileDataJson = await csv().fromFile(inputData.files.trainFileData.filepath);
      trainFileData = await jsonexport(outputTrainFileDataJson);

      let outputValFileDataJson = await csv().fromFile(inputData.files.valFileData.filepath);
      valFileData = await jsonexport(outputValFileDataJson);
      numValExamples = outputValFileDataJson.length;
    }

    // Get user ID
    const filtered_user = await db
      .collection("users")
      .findOne({email: session.user.email});
    const user_id = filtered_user._id;
    if (user_id === '') {
      response.status(400).json({ error: 'Must specify user' })
      return;
    }

    // Get project ID
    const project = await db
      .collection("projects")
      .findOne({userId: user_id, name: projectName});
    if (!project) {
      response.status(400).json({ error: 'Project not found' });
      return;
    }

    // Check if dataset already exists
    const filtered_dataset = await db
      .collection("datasets")
      .findOne({name: name, projectId: project._id});
    if (filtered_dataset) {
      response.status(400).json({error:"Dataset name already exists, pick a unique name."});
      return;
    }

    const trainParams = {
      ACL: 'public-read',
      Body: trainFileData,
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + trainFileName,
    };
    const valParams = {
      ACL: 'public-read',
      Body: valFileData,
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + valFileName,
    };

    const d = await db
      .collection("datasets")
      .insertOne({
          name: name,
          description: description,
          userId: user_id,
          projectId: project._id,
          fileName: filename,
          trainFileName: trainFileName,
          initialTrainFileName: initialTrainFileName,
          valFileName: valFileName,
          initialValFileName: initialValFileName,
          numTrainExamples: numTrainExamples,
          numValExamples: numValExamples,
          timeCreated: Date.now(),
        });
    console.log(d);

    response.status(200).json(d);

    // Wrap writing files to S3 in a Promise
    return new Promise((resolve, reject) => {
      myBucket.putObject(trainParams, function(trainErr, trainData) {
        if (trainErr) {
          reject();
        }
        console.log("Successfully wrote " + trainFileName);
        if (!valFileName) {
          resolve();
        } else {
          myBucket.putObject(valParams, function(valErr, valData) {
            if (valErr) {
              reject();
            } else {
              console.log("Successfully wrote " + valFileName);
              resolve();
            };
          });
        }
      });
    });
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
