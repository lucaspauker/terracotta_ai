import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

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
    const name = request.body.name;
    console.log(request);

    await client.connect();
    const db = client.db("sharpen");

    const dataset = await db
      .collection("datasets")
      .updateOne({"_id": new ObjectId(id)}, {$set: {"name": name}});
    if (!dataset) {
      response.status(400).json({error:"Dataset not found!"});
      return;
    }

    response.status(200).send(dataset);
    return;
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
