import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI);

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
    const apiKey = request.body.apiKey;
    const update = request.body.update;
    let updateSet = {};
    if (update === "openai") {
      updateSet["openAiKey"] = apiKey;
    } else if (update === "cohere") {
      updateSet["cohereKey"] = apiKey;
    }

    await client.connect();
    const db = client.db("sharpen");

    const user = await db
      .collection("users")
      .findOne({email: session.user.email});

    const userId = user._id;

    await db
      .collection("users")
      .updateOne({"_id" : userId},
      {$set: updateSet});

    console.log("User API keys successfully added");
    response.status(200).json();
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
