import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(400).json({ error: 'Use GET request' })
    return;
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  const { id } = request.query;

  try {
    await client.connect();
    const db = client.db("sharpen");

    const m = await db
      .collection("models")
      .findOne({_id: new ObjectId(id)});
    if (!m) {
      response.status(400).json({error:"Model not found!"});
      return;
    }

    const dataset = await db
      .collection("datasets")
      .findOne({_id: m.datasetId});

    const template = await db
      .collection("templates")
      .findOne({_id: m.templateId});

    const modelWithDataset = {
      _id: m._id,
      name: m.name,
      status: m.status,
      modelArchitecture: m.modelArchitecture,
      provider: m.provider,
      providerData: m.providerData,
      cost: m.cost,
      datasetId: m.datasetId,
      datasetName: dataset ? dataset.name : null,
      templateId: m.templateId,
      templateString: template.templateString,
      stopSequence: template.stopSequence,
    };

    response.status(200).json(modelWithDataset);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
