import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

import User from '@/schemas/User';
import Project from '@/schemas/Project';
import Evaluation from '@/schemas/Evaluation';
import Dataset from "@/schemas/Dataset";
import Template from "@/schemas/Template";
import ProviderModel from "@/schemas/ProviderModel";

const createError = require('http-errors');
const mongoose = require('mongoose');

const csv = require('csvtojson');
const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const ObjectId = require('mongodb').ObjectId;

const OpenAI = require("openai");

const client = new S3Client({ region: REGION });

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
    const column = request.body.column;
    const datasetId = request.body.datasetId;

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    const dataset = await Dataset.findOne({userId: user._id, _id: datasetId});
    if (!dataset) {
      throw createError(400,'Dataset not found');
    }

    let fileName;
    if (dataset.valFileName) {
      fileName = dataset.valFileName;
    } else {
      fileName = dataset.trainFileName;
    }
    const params = {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + fileName,
    };
    const command = new GetObjectCommand(params);
    const s3Response = await client.send(command);
    const stream = s3Response.Body;
    const json_output = await csv({trim:false}).fromStream(stream);

    let classes = new Set();
    for (let i=0; i<json_output.length; i++) {
      classes.add(json_output[i][column]);
    }
    classes = Array.from(classes);
    response.status(200).json(classes);
  } catch (error) {
    console.error(error);
    await Evaluation.findByIdAndUpdate(newEvaluationId, {
      status: "failed"
    })
    if (!error.status) {
      error = createError(500, 'Error creating evaluation');
    }
    response.status(error.status).json({ error: error.message });
  }
}

