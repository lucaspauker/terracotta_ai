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
const csv = require('csv-parser');
const csvWriter = require('csv-writer').createObjectCsvStringifier;

const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const client = new S3Client({ region: REGION });

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
};

const uploadCsvToS3 = async (bucketName, key, rows) => {
  const dataKeysObject = Object.keys(rows[0]).map(k => ({id:k, title:k}));
  const csvStringifier = csvWriter({ header: dataKeysObject });
  const csvData = `${csvStringifier.getHeaderString()}\n${csvStringifier.stringifyRecords(rows)}`;
  const buffer = Buffer.from(csvData, 'utf8');

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer
  };

  await client.send(new PutObjectCommand(params));
};

const readCsvFromS3 = async (bucketName, key) => {
  const params = {
    Bucket: bucketName,
    Key: key
  };

  const response = await client.send(new GetObjectCommand(params));
  const stream = response.Body;

  return new Promise((resolve, reject) => {
    const rows = [];
    let header;

    stream
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
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

  let newDatasetId = null;

  let didReturn = false;
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
    didReturn = true;

    let trainFileData = {};
    let valFileData = {};
    if (autoGenerateVal) {
      // FIRST case: Automatically generate validation data from training data
      console.log("Generating val file with this many entries: " + numValExamples);

      const rows = await readCsvFromS3(S3_BUCKET, 'raw_data/' + trainFileName);
      console.log("# of rows:", rows.length);

      console.log("Converted data to CSV");
      console.log(rows[0]);
      console.log(rows[1]);

      const shuffled = shuffleArray(rows);
      console.log("Shuffled data");
      console.log(shuffled[0]);
      console.log(shuffled[1]);

      let valFileDataRows = shuffled.slice(0, numValExamples);
      let trainFileDataRows = shuffled.slice(numValExamples, shuffled.length);
      console.log("# of val rows:", valFileDataRows.length);
      console.log("# of train rows:", trainFileDataRows.length);
      console.log("Got shuffled data");

      await uploadCsvToS3(S3_BUCKET, 'raw_data/' + valFileName, valFileDataRows);
      console.log("Divided and uploaded val data");

      await uploadCsvToS3(S3_BUCKET, 'raw_data/' + trainFileName, trainFileDataRows);
      console.log("Divided and uploaded train data");

      numTrainExamples = trainFileDataRows.length;
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
      numTrainExamples: numTrainExamples,  // Include these since we update them
      valFileName: valFileName,
      initialValFileName: initialValFileName,
    })
  } catch (error) {
    console.log(error);
    if (newDatasetId) {
      await Dataset.findByIdAndUpdate(newDatasetId, {
        status: "failed",
      })
    }
    if (didReturn) return;
    if (!error.status) {
      error = createError(500, 'Error creating dataset');
    }
    response.status(error.status).json({ error: error.message });
  }
}
