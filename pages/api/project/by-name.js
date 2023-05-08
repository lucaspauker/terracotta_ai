import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
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

  let projectName = request.body.projectName;

  try {
    await client.connect();
    const db = client.db("sharpen");

    const p = await db
      .collection("projects")
      .findOne({name: projectName});
    if (!p) {
      response.status(400).json({error:"Project not found!"});
      return;
    }

    response.status(200).json(p);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
