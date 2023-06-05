import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import AWS from 'aws-sdk'

import ProviderModel from "@/schemas/ProviderModel";
import User from "@/schemas/User";
import Dataset from "@/schemas/Dataset";
import Model from "@/schemas/Model";
import Template from "@/schemas/Template";
import { templateTransform } from "@/utils/template";

const csv = require('csvtojson');
const createError = require('http-errors');
const mongoose = require('mongoose');
const {encode} = require('gpt-3-encoder')

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
    await mongoose.connect(process.env.MONGOOSE_URI);

    // Assume the model is a finetuned model for now
    const modelId = request.body.modelId;
    const datasetId = request.body.datasetId;

    const user =  await User.findOne({email: session.user.email});
    if (!user) { throw createError(400, 'User not found'); }

    const dataset = await Dataset.findOne({_id: datasetId, userId: user._id});
    if (!dataset) { throw createError(400, 'Dataset not found'); }

    const model = await Model.findOne({_id: modelId, userId: user._id});
    if (!model) { throw createError(400, 'Model not found'); }

    const template = await Template.findOne({_id: model.templateId});  // I think that querying by user is not necessary
    if (!template) { throw createError(400, 'Model template not found'); }

    const providerModel = await ProviderModel.findOne({provider: model.provider, finetuneName: model.modelArchitecture});
    if (!providerModel) { throw createError(400, 'Provider model not found'); }

    // Download 50 rows from the dataset
    let fileName;
    let datasetLength;
    if (dataset.valFileName) {
      fileName = dataset.valFileName;
      datasetLength = dataset.numValExamples;
    } else {
      fileName = dataset.trainFileName;
      datasetLength = dataset.numTrainExamples;
    }

    console.log(fileName);
    const params = {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + fileName,
    };

    let lines = [];
    const maxLines = 50;
    const csvParser = csv();
    const stream = myBucket.getObject(params).createReadStream();
    const processStream = new Promise((resolve, reject) => {
      stream
        .pipe(csvParser)
        .on('data', (line) => {
          if (maxLines && lines.length >= maxLines) {
            // Stop reading after reaching the specified maxLines
            stream.destroy();
            resolve(lines);
          } else {
            lines.push(JSON.parse(line.toString()));
          }
        })
        .on('end', () => {
          // Resolve the promise with the lines array
          resolve(lines);
        })
        .on('error', (error) => {
          // Reject the promise if there's an error
          reject(error);
        });
    });

    // Count the number of tokens in the first 50 lines of the file with the template
    let numTokens = 0;
    let ret = await processStream;
    ret.forEach((rowData) => {
      const input = templateTransform(template.templateString, rowData);
      numTokens += encode(input).length;

      const output = rowData[template.outputColumn];
      numTokens += encode(output).length + encode(template.stopSequence).length;
    });

    // Scale the 50 up to size of dataset
    numTokens = numTokens * (datasetLength / lines.length);

    console.log(numTokens + ' tokens found');

    const estimatedCost = (numTokens / 1000) * providerModel.finetuneCompletionCost;

    console.log('Estimated cost: ' + estimatedCost);

    response.status(200).json(estimatedCost.toFixed(2));

  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error estimating cost');
    }
    response.status(error.status).json({ error: error.message });
  }
}
