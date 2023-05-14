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
    await client.connect();
    const db = client.db("sharpen");

    const name = request.body.name;
    const type = request.body.type;

    if (name === '') {
      response.status(400).json({ error: 'Must specify a name' })
      return;
    }

    // Get user ID
    const filtered_user = await db
      .collection("users")
      .findOne({email: session.user.email});
    const user_id = filtered_user._id;
    if (user_id === '') {
      response.status(400).json({ error: 'Must specify user' })
      return;
    }

    const projects = await db
      .collection("projects")
      .find({
        user_id: user_id,
        name: name,
      });
    if (projects.length > 0) {
      response.status(400).json({error:"Project name already exists, pick a unique name."});
      return;
    }

    const d = await db
      .collection("projects")
      .insertOne({
          name: name,
          type: type,
          userId: user_id,
          timeCreated: Date.now(),
        });
    console.log(d);
    response.status(200).json(d);

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
