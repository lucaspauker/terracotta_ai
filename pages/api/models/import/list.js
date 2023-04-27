import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI);
const { Configuration, OpenAIApi } = require("openai");

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
    const projectName  = request.body.projectName;
    await client.connect();
    const db = client.db("sharpen");

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

    const configuration = new Configuration({
        apiKey: user.openAiKey,
      });
    const openai = new OpenAIApi(configuration);

    let finetunes = await openai.listFineTunes();
    finetunes = finetunes.data.data;
    
    const currentModels = await db
      .collection("models")
      .find({userId: userId, projectId: projectId, provider: "openai"})
      .toArray();
    
    const currentModelIds = currentModels.map(({providerData})=>providerData.fintuneId);

    let importableModels = [];

    for (let i=0; i<finetunes.length; i++) {
      const finetune = finetunes[i];
      if (finetune.status = "succeeded" && !currentModelIds.includes(finetune.id)) {
        importableModels.push(finetune);
      }
    }

    response.status(200).json(importableModels);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
