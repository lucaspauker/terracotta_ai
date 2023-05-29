import { IncomingForm } from 'formidable'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import AWS from 'aws-sdk'
import Project from '../../../schemas/Project';  
import User from '../../../schemas/User';
import Dataset from '../../../schemas/Dataset';

const createError = require('http-errors');
const mongoose = require('mongoose');
const jsonexport = require('jsonexport');
const csv = require('csvtojson');
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
    await mongoose.connect(process.env.MONGOOSE_URI);

    const inputData = await new Promise((resolve, reject) => {
      const form = new IncomingForm()

      form.parse(request, (err, fields, files) => {
        if (err) return reject(err)
        resolve({ fields, files })
      })
    });

    const name = inputData.fields.name;
    const description = inputData.fields.description;
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
      throw createError(400, 'Must provide a name for the dataset');
    }
    if (filename === '') {
      throw createError(400, 'Must provide a file');
    }
    if (inputData.files.trainFileData === '') {
      throw createError(400, 'Must provide a training file');
    }

    // Get user ID
    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    // Get project ID
    const project = await Project.findOne({userId: userId, name: projectName});
    if (!project) {
      throw createError(400,'Project not found');
    }

    // Check if dataset already exists
    const filteredDataset = await Dataset.findOne({name: name, projectId: project._id});
    if (filteredDataset) {
      throw createError(400,'Dataset name already exists, pick a unique name.');
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


    const d = Dataset.create({
      name: name,
      description: description,
      userId: userId,
      projectId: project._id,
      fileName: filename,
      trainFileName: trainFileName,
      initialTrainFileName: initialTrainFileName,
      valFileName: valFileName,
      initialValFileName: initialValFileName,
      numTrainExamples: numTrainExamples,
      numValExamples: numValExamples,
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
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error creating dataset');
    }
    response.status(error.status).json({ error: error.message });
  }
}
