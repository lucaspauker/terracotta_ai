import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import Project from '@/schemas/Project';
import User from '@/schemas/User';
import Dataset from '@/schemas/Dataset';
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const createError = require('http-errors');
const mongoose = require('mongoose');

const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
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

  const { id } = request.query;

  try {
    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    const d = await Dataset.findOne({_id: id, userId: user._id});
    if (!d) {
      throw createError(400, 'Dataset not found')
    }

    if (d.trainFileName) {
      const params = {
        Bucket: S3_BUCKET,
        Key: 'raw_data/' + d.trainFileName,
      };
      let response = await client.send(new DeleteObjectCommand(params));
    }
    if (d.valFileName) {
      const params = {
        Bucket: S3_BUCKET,
        Key: 'raw_data/' + d.valFileName,
      };
      let response = await client.send(new DeleteObjectCommand(params));
    }

    await Dataset.deleteOne({_id: id, userId: user._id});

    response.status(200).send();
  } catch (error) {
    console.error(error);
    if (!error.status) {
      error = createError(500, 'Error deleting dataset');
    }
    response.status(error.status).json({ error: error.message });
  }
}
