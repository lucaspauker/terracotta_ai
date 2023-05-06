import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

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
    const evaluation = await db.collection("evaluations").findOne({_id: new ObjectId(id) });
    if (!evaluation) {
      response.status(400).json({error:"Evaluation not found!"});
      return;
    }

    // TODO: add datasetName and modelName to return
    
    response.status(200).send(evaluation);
    return;
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
