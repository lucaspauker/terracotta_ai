import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'
const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
  }

  try {
    await client.connect();
    const db = client.db("sharpen");

    const email = request.body.email;

    if (email === '') {
      response.status(400).json({ error: 'Must specify an email' })
      return;
    }

    const duplicateEmails = await db
      .collection("emails")
      .find({
        email: email,
      }).toArray();
    if (duplicateEmails.length > 0) {
      console.log("Duplicate email");
      response.status(200).end();
      return;
    }

    const res = await db
      .collection("emails")
      .insertOne({
          email: email,
          timeCreated: Date.now(),
        });
    response.status(200).json(res);

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
