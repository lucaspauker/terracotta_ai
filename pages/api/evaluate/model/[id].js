import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
import AWS from 'aws-sdk'
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

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
    await client.connect();
    const db = client.db("sharpen");

    const model = await db
      .collection("models")
      .findOne({_id: new ObjectId(id)});
    if (!model) {
      response.status(400).json({error:"Model not found!"});
      return;
    }

    // Get evaluations
    const evals = await db.collection("evaluations")
      .aggregate([
        {
          $match: { modelId: new ObjectId(id) }
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
            metrics: "$metrics",
            metricResults: "$metricResults",
            trainingEvaluation: "$trainingEvaluation",
          }
        }
      ]).toArray();

    // Get training curve data if it exists
    if (model.providerData.resultsFileName) {
      const params = {
        Bucket: S3_BUCKET,
        Key: model.providerData.resultsFileName,
      };
      let x = [];
      let y = [];
      const s3Res = await myBucket.getObject(params).promise();
      const data = s3Res.Body.toString('utf-8').split('\n');
      // Skip the first row since it is the header row
      // The last row is an empty string, so skip that as well
      for (let i=1; i<data.length - 1; i++) {
        let splitData = data[i].split(',');
        x.push(Number(splitData[0]));
        y.push(Number(splitData[3]));
      }
      response.status(200).json({
        'evals': evals,
        'trainingCurve': {
          'x': x,
          'y': y,
        },
      });
      return;
    } else {
      response.status(200).json({'evals': evals});
      return;
    }
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
