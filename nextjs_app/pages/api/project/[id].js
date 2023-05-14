import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
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

    const project = await db
      .collection("projects")
      .findOne({_id: new ObjectId(id)});

    if (!project) {
      response.status(400).json({error:"Project not found!"});
      return;
    }

    response.status(200).send(project);
    return;
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
