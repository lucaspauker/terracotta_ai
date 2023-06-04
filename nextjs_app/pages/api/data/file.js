import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import AWS from 'aws-sdk'

const csv = require('csvtojson');
// const client = new MongoClient(process.env.MONGODB_URI);
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

function shuffle(a) {
  let j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function getRandomSubset(list, N) {
  const subset = [];
  const length = list.length;
  const indices = new Set();

  if (N >= length) {
    return (shuffle(list));
  }

  while (indices.size < N) {
    const randomIndex = Math.floor(Math.random() * length);
    indices.add(randomIndex);
  }

  for (const index of indices) {
    subset.push(list[index]);
  }

  return subset;
}

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
    const fileName = request.body.fileName;
    const maxLines = request.body.maxLines || 1000;  // Only read 1000 lines ever
    const shuffle = request.body.shuffle || false;  // Shuffle will return maxLines number of inputs
    const shuffleMaxLines = request.body.shuffleMaxLines || 50;  // How many lines will be read before shuffling.
                                                                 // This should be bigger than maxLines
    const s3Folder = request.body.s3Folder || 'raw_data';

    const params = {
      Bucket: S3_BUCKET,
      Key: s3Folder + '/' + fileName,
    };

    console.log("Retrieving file: " + 'raw_finetune_data/' + request.body.fileName);

    const stream = myBucket.getObject(params).createReadStream();

    const csvParser = csv();
    let lines = [];

    const processStream = new Promise((resolve, reject) => {
      stream
        .pipe(csvParser)
        .on('data', (line) => {
          if ((!shuffle && maxLines && lines.length >= maxLines) || (shuffle && lines.length >= shuffleMaxLines)) {
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

    let ret = await processStream;
    if (maxLines && shuffle) {
      ret = getRandomSubset(ret, maxLines);
    }
    response.status(200).json(ret);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}

