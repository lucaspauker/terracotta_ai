import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
import AWS from 'aws-sdk'

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const csv = require('csvtojson');
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
    const name = request.body.name;
    const description = request.body.description;
    const datasetName = request.body.datasetName;
    const modelName = request.body.modelName;
    const projectName = request.body.projectName;
    const metrics = request.body.metrics;

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

    // First, get the dataset and model from the database
    const dataset = await db
      .collection("datasets")
      .findOne({userId: userId, name: datasetName});
    if (!dataset) {
      response.status(400).json({ error: 'Dataset not found' });
      return;
    }

    const model = await db
      .collection("models")
      .findOne({userId: userId, name: modelName});
    if (!model) {
      response.status(400).json({ error: 'Model not found' });
      return;
    }

    // Next, call inference for every example
    const fileName = dataset.valFileName;
    const params = {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + fileName,
    };
    const stream = myBucket.getObject(params).createReadStream();
    const json_output = await csv().fromStream(stream);

    const ret = await db
      .collection("evaluations")
      .insertOne({
          name: name,
          description: description,
          datasetId: dataset._id,
          projectId: project._id,
          modelId: model._id,
          userId: user._id,
          metrics: metrics,
          metricResults: {},
          trainingEvaluation: false,
        });
    console.log(ret);

    response.status(200).send(ret);

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}

