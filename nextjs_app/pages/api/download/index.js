import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const createError = require('http-errors');

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

    try {
      const downloadId = request.body.downloadId;
      const filename = request.body.downloadName;
      const params = {
        Bucket: S3_BUCKET,
        Key: downloadId,
        ResponseContentDisposition: `attachment; filename="${filename}"`,
      };

      const command = new GetObjectCommand(params);

      const url = await getSignedUrl(client, command, { expiresIn: 600 });
      return response.status(200).json({downloadUrl: url});

    } catch (error) {
      console.log(error);
      if (!error.status) {
        error = createError(500, 'Error fetching file');
      }
      response.status(error.status).json({ error: error.message });
    }
  }
