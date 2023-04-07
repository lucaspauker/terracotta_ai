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
    const filename = request.body.filename;
    const datetime = request.body.datetime;
    if (name === '') {
      response.status(400).json({ error: 'Must specify a name' })
      return;
    }

    const filtered_dataset = await db
      .collection("datasets")
      .findOne({name: name});
    if (filtered_dataset) {
      response.status(400).json({error:"Dataset name already exists, pick a unique name."});
      return;
    }

    const d = await db
      .collection("datasets")
      .insertOne({
          name: name,
          type: type,
          filename: filename,
          datetime: datetime,
        });
    console.log(d);
    response.status(200).json(d);

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
