import { IncomingForm } from 'formidable'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import Project from '@/schemas/Project';
import User from '@/schemas/User';
import Dataset from '@/schemas/Dataset';

const createError = require('http-errors');
const mongoose = require('mongoose');
const jsonexport = require('jsonexport');
const csv = require('csvtojson');
const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const client = new S3Client({ region: REGION });

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

  let newDatasetId = null;
  try {
    await mongoose.connect(process.env.MONGOOSE_URI);


    console.log(request.body);
    const name = request.body.name;
    const description = request.body.description;
    const projectName = request.body.projectName;
    const autoGenerateVal = request.body.autoGenerateVal;
    let numValExamples = request.body.numValExamples;
    const headers = request.body.headers;

    const trainFileName = request.body.trainFileName;
    const initialTrainFileName = request.body.initialTrainFileName;
    let numTrainExamples = request.body.numTrainExamples;
    let valFileName = request.body.valFileName;
    let initialValFileName = request.body.initialValFileName;

    if (name === '') {
      throw createError(400, 'Must provide a name for the dataset');
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

    const d = await Dataset.create({
      name: name,
      description: description,
      userId: userId,
      projectId: project._id,
      trainFileName: trainFileName,
      initialTrainFileName: initialTrainFileName,
      valFileName: valFileName,
      initialValFileName: initialValFileName,
      numTrainExamples: numTrainExamples,
      numValExamples: numValExamples,
      headers: headers,
      status: "loading",
    });
    newDatasetId = d._id;

    response.status(200).json(d);

    let trainFileData = {};
    let valFileData = {};
    if (autoGenerateVal) {
      // FIRST case: Automatically generate validation data from training data
      console.log("Generating val file with this many entries: " + numValExamples);
      const getObjectCommand = new GetObjectCommand({ Bucket: S3_BUCKET, Key: 'raw_data/' + trainFileName });
      const { Body } = await client.send(getObjectCommand);

      // Read the CSV file and convert it to JSON
      const jsonArray = await csv().fromStream(Body);
      const shuffled = jsonArray.sort(() => 0.5 - Math.random());
      let outputValFileDataJson = shuffled.slice(0, numValExamples);
      let outputTrainFileDataJson = shuffled.slice(numValExamples, shuffled.length);

      // TODO: Parallelize this
      valFileData = await jsonexport(outputValFileDataJson);
      const valPutObjectCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: 'raw_data/' + valFileName,
        Body: valFileData,
      });
      await client.send(valPutObjectCommand);
      console.log("Divided and uploaded val data");

      trainFileData = await jsonexport(outputTrainFileDataJson);
      const trainPutObjectCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: 'raw_data/' + trainFileName,
        Body: trainFileData,
      });
      await client.send(trainPutObjectCommand);
      console.log("Divided and uploaded train data");

      numTrainExamples = outputTrainFileDataJson.length;
    } else if (initialValFileName === '') {
      // SECOND case: No validation file specified, so set entries to null in the database
      console.log("No validation file specified");

      valFileName = null;
      initialValFileName = null;
    } else {
      // THIRD case: Both train and val files are specified
      // Don't need to do anything since we already uploaded files to S3
      console.log("Both train and validation files are specified");
    }

    await Dataset.findByIdAndUpdate(newDatasetId, {
      status: "succeeded",
      numTrainExamples: numTrainExamples,
    })
  } catch (error) {
    console.log(error);
    if (newDatasetId) {
      await Dataset.findByIdAndUpdate(newDatasetId, {
        status: "failed",
      })
    }
    if (!error.status) {
      error = createError(500, 'Error creating dataset');
    }
    response.status(error.status).json({ error: error.message });
  }
}
