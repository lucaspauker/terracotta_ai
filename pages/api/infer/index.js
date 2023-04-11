import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

  const provider = request.body.provider;
  const model = request.body.model;
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


    openai.createCompletion({
      model: model,
      prompt: prompt,
      temperature: 0.6,
      max_tokens: 100,
    }).then((completion) => {
      console.log(completion.data.choices[0].text);
      response.status(200).json(completion.data);
      return;
    }).catch((e) => {
      response.status(400).json({error: e});
      return;
    });
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
