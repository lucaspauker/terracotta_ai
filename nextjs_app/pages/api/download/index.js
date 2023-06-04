import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

const AWS = require('aws-sdk');
const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;

const createError = require('http-errors');

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
    }
  
    const session = await getServerSession(request, response, authOptions);
    if (!session) {
      response.status(401).json({error: 'Not logged in'});
      return;
    }
  
    try {
      const downloadId = request.body.downloadId;
      const filename = request.body.downloadName;
      const s3 = new AWS.S3();
      const params = {
        Bucket: S3_BUCKET,
        Key: downloadId,
        ResponseContentDisposition: `attachment; filename="${filename}"`,
        Expires: 60
      };

      s3.getSignedUrl('getObject', params, (error, url) => {
        if (error) {
          throw createError(500, 'Error fetching file');
        }
        console.log('URL', url);
        return response.status(200).json({downloadUrl: url});
      });


    } catch (error) {
      if (!error.status) {
        error = createError(500, 'Error fetching file');
      }
      response.status(error.status).json({ error: error.message });
    }
  }