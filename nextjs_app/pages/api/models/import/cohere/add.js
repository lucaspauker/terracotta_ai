import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]"
import { MongoClient } from 'mongodb'

const path = require('path');

const mongoClient = new MongoClient(process.env.MONGODB_URI);

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
  
    try {
      const projectName = request.body.projectName;
      const modelName = request.body.modelName;
      const modelId = request.body.model;

      console.log(request.body);

      await mongoClient.connect();
      const db = mongoClient.db("sharpen");
      
      const user = await db
      .collection("users")
      .findOne({email: session.user.email});
      if (!user) {
        response.status(400).json({ error: 'User not found' });
        return;
      }

      const userId = user._id;

      const project = await db
        .collection("projects")
        .findOne({userId: userId, name: projectName});
      if (!project) {
        response.status(400).json({ error: 'Project not found' });
        return;
      }

      const projectId = project._id;

      // TODO: Retrieve cost from openai

      const d = await db
      .collection("models")
      .insertOne({
          name: modelName,
          provider: "cohere",
          modelArchitecture: null,
          status: "imported",
          datasetId: null,
          projectId: project._id,
          userId: userId,
          cost: null,
          providerData: {
            modelId: modelId,
          },
        });

      response.status(200).send();
  
    } catch (e) {
      console.error(e);
      response.status(400).json({ error: e })
    }
  }