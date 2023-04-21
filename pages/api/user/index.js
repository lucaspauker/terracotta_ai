import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(400).json({ error: 'Use GET request' })
  }

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

    response.status(200).json(user);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
