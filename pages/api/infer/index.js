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

  const provider = request.body.provider;
  let model = request.body.model;
  const prompt = request.body.prompt;

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

    // This is a bit of a hack, we should store this in the backend
    const finetunes = await openai.listFineTunes();
    let openAiModelName = model;
    console.log(finetunes.data.data.length);
    for (let i=0; i<finetunes.data.data.length; i++) {
      if (finetunes.data.data[i].id === model) {
        openAiModelName = finetunes.data.data[i].fine_tuned_model;
      }
    }
    const completion = await openai.createCompletion({
      model: openAiModelName,
      prompt: prompt,
      max_tokens: 1000,
    });
    console.log(completion.data.choices[0].text);
    response.status(200).json(completion.data);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
