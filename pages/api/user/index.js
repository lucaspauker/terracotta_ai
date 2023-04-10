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
    if (!email) {
      response.status(400).json({error: "Must provide email!"});
      return;
    }

    const filtered_user = await db
      .collection("users")
      .findOne({email: email});
    if (filtered_user) {
      response.status(200).json(filtered_user);
      return;
    }
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
