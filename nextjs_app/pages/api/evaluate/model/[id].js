import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
const ObjectId = require('mongodb').ObjectId;

import Evaluation from '@/schemas/Evaluation';
import Model from '@/schemas/Model';
import User from '@/schemas/User';

const createError = require('http-errors');
const mongoose = require('mongoose');

const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const client = new S3Client({ region: REGION });

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(400).json({ error: 'Use GET request' })
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  const { id } = request.query;

  try {
    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    const model = await Model.findOne({_id: id, userId: user._id});
    if (!model) {
      throw createError(400, 'Model not found');
    }

    // Get evaluations
    const evals = await Evaluation
      .aggregate([
        {
          $match: { modelId: new ObjectId(id), userId: user._id }
        },
        {
          $lookup: {
            from: "datasets",
            localField: "datasetId",
            foreignField: "_id",
            as: "dataset"
          }
        },
        {
          $unwind: { path: "$dataset", preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            _id: "$_id",
            name: "$name",
            datasetId: "$dataset._id",
            datasetName: "$dataset.name",
            description: "$description",
            status: "$status",
            metrics: "$metrics",
            metricResults: "$metricResults",
            trainingEvaluation: "$trainingEvaluation",
          }
        }
      ]);

    // Get training curve data if it exists
    if (model.providerData && model.providerData.resultsFileName) {
      model.providerData = model.providerData;
      const params = {
        Bucket: S3_BUCKET,
        Key: model.providerData.resultsFileName,
      };
      let x = [];
      let y = [];
      let yMovingAverage = [];
      const n = 100;  // Moving average parameter
      const command = new GetObjectCommand(params);
      const s3Response = await client.send(command);
      const s3Data = await s3Response.Body.transformToString();
      const data = s3Data.split('\n');

      // Skip the first row since it is the header row
      // The last row is an empty string, so skip that as well
      for (let i=1; i<data.length - 1; i++) {
        let splitData = data[i].split(',');
        x.push(Number(splitData[0]));
        y.push(Number(splitData[1]));


        // Calculate the moving average of y using a sliding window
        if (i >= n) {
          let sum = y.slice(i - n, i).reduce((a, b) => a + b);
          yMovingAverage.push(sum / n);
        } else {
          yMovingAverage.push(null);
        }
      }
      response.status(200).json({
        'evals': evals,
        'trainingCurve': {
          'x': x,
          'y': y,
          'yMovingAverage': yMovingAverage,
        },
      });
      return;
    } else {
      response.status(200).json({'evals': evals});
      return;
    }
  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error creating evaluation');
    }
    response.status(error.status).json({ error: error.message });
  }
}
