import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

const { Configuration, OpenAIApi } = require("openai");

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

  const prompt = request.body.prompt;
  let modelName = request.body.modelName;
  let projectName = request.body.projectName;
  let hyperParams = request.body.hyperParams;

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {
    await client.connect();
    const db = client.db("sharpen");

    // Get user in order to keep track of history
    const user = await db
      .collection("users")
      .findOne({email: session.user.email});
    if (!user) {
      response.status(400).json({ error: 'User not found' });
      return;
    }

    // Configure openai with user API key
    const configuration = new Configuration({
      apiKey: user.openAiKey,
    });
    const openai = new OpenAIApi(configuration);

    let max_tokens = Number(hyperParams.maxTokens);
    let temperature = Number(hyperParams.temperature);
    console.log(modelName);
    if (modelName.substring(0,4) === 'text') {  // Stock OpenAI model
      const completion = await openai.createCompletion({
        model: modelName,
        prompt: prompt,
        max_tokens: max_tokens,
        temperature: temperature,
      });
      response.status(200).json(completion.data);
      return;
    } else {  // Finetuned model

      const project = await db
        .collection("projects")
        .findOne({userId: user._id, name: projectName});
      if (!project) {
        response.status(400).json({ error: 'Project not found' });
        return;
      }
      console.log(project);

      // Get model based on the name and project
      const model = await db
        .collection("models")
        .findOne({providerModelId: modelName, projectId: project._id});
      if (!user) {
        response.status(400).json({ error: 'User not found' });
        return;
      }
      console.log(model);

      //if (project.type === 'classification') max_tokens = 20;  // Classification
      const completion = await openai.createCompletion({
        model: model.providerModelName,
        prompt: prompt + "\n\n###\n\n",
        max_tokens: max_tokens,
        temperature: temperature,
        stop: ' \n',
      });
      response.status(200).json(completion.data);
      return;
    }
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
