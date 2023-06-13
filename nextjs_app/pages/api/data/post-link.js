import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const createError = require('http-errors');
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

  try {
    const post = await createPresignedPost(client, {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + request.query.file,
      ContentType: 'text/csv',
      Expires: 600, // seconds
      Conditions: [
        ['content-length-range', 0, 150 * 1000000], // Buffer of extra 22MB
      ],
    });

    response.status(200).json(post);
  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error fetching file');
    }
    response.status(error.status).json({ error: error.message });
  }
}
