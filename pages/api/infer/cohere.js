import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

const cohere = require('cohere-ai');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

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

    // Configure cohere with user API key
    cohere.init(user.cohereKey);

    if (model.startsWith("generate")) {

        const generateResponse = await cohere.generate({
            prompt: prompt,
            max_tokens: 50,
            model: model.split('-')[1]
        });
      
        console.log(generateResponse);
      
        const output = generateResponse["body"]["generations"][0]["text"];

        response.status(200).json({"output":output});

    } else if (model.startsWith("classify")) {
        response.status(200).json({"output":"Classification not supported yet"});
    } else {
        response.status(400).json({ error: 'Invalid model type' });
    }
    
    
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}