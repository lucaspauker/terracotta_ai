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

  const projectName = request.body.projectName;

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {
    await client.connect();
    const db = client.db("sharpen");

    const user = await db
      .collection("users")
      .findOne({email: session.user.email});

    if (!user) {
      response.status(400).json({ error: 'User not found' });
      return;
    }
    console.log(user._id, projectName);

    // Get project ID
    const project = await db
      .collection("projects")
      .findOne({userId: user._id, name: projectName});
    if (!project) {
      response.status(400).json({ error: 'Project not found' });
      return;
    }

    const datasets = await db
      .collection("datasets")
      .find({userId: user._id, projectId: project._id})
      .toArray();
    response.status(200).json(datasets);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
