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
    const first_name = request.body.first_name;
    const last_name = request.body.last_name;
    const picture = request.body.picture;
    const datetime = request.body.datetime;
    if (!email) {
      response.status(400).json({error: "Must provide email!"});
      return;
    }
    if (!first_name) {
      response.status(400).json({error:"Must provide first name!"});
      return;
    }
    if (!last_name) {
      response.status(400).json({error: "Must provide last name!"});
      return;
    }

    const filtered_user = await db
      .collection("users")
      .findOne({email: email});
    if (filtered_user) {
      response.status(200).json("User already exists, didn't do anything.");
      return;
    }

    const u = await db
      .collection("users")
      .insertOne({
          email: email,
          firstName: first_name,
          lastName: last_name,
          picture: picture,
          timeCreated: datetime,
        });
    console.log(u);
    response.status(200).json(u);

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
