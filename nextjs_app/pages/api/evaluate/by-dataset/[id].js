import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(400).json({ error: 'Use GET request' })
    return;
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  const { id } = request.query;
  console.log(id);

  try {
    await client.connect();
    const db = client.db("sharpen");

    const evals = await db
      .collection("evaluations")
      .find({datasetId: new ObjectId(id)})
      .toArray();
    console.log(evals);

    response.status(200).json(evals);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
