import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
import AWS from 'aws-sdk'

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

export default async function handler(request, response) {
  // This function gets a file from S3 by using the filename inputted in the request

  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {
    const params = {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + request.body.fileName,
    };

    console.log("Retreiving file: " + 'raw_finetune_data/' + request.body.filename);

    console.log(params);
    const stream = myBucket.getObject(params).createReadStream();
    const json_output = await csv().fromStream(stream);

    response.status(200).json(json_output);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}

