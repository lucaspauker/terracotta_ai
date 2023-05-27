import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
import {templateTransform} from '../../../utils/template';

const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

const { Configuration, OpenAIApi } = require("openai");

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

  const prompt = request.body.prompt;
  const model = request.body.model;
  let completionName = request.body.completionName;
  let projectName = request.body.projectName;
  let hyperParams = request.body.hyperParams;
  let finetuneInputData = request.body.finetuneInputData;

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

    if (completionName) {  // Stock OpenAI model
      const completion = await openai.createCompletion({
        model: completionName,
        prompt: prompt,
        max_tokens: max_tokens,
        temperature: temperature,
      });
      response.status(200).json(completion.data.choices[0].text);
      return;
    } else {  // Finetuned model

      const project = await db
        .collection("projects")
        .findOne({userId: user._id, name: projectName});
      if (!project) {
        response.status(400).json({ error: 'Project not found' });
        return;
      }

      const template = await db
        .collection("templates")
        .findOne({_id: new ObjectId(model.templateId)});

      const templateString = template.templateString;

      const completion = await openai.createCompletion({
        model: model.providerData.modelId,
        prompt: templateTransform(templateString, finetuneInputData),
        max_tokens: max_tokens,
        temperature: temperature,
        stop: template.stopSequence,
      });
      response.status(200).json(completion.data.choices[0].text);
      return;
    }
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
