import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { MongoClient } from 'mongodb'

const mongoClient = new MongoClient(process.env.MONGODB_URI);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
      response.status(400).json({ error: 'Use POST request' })
      return;
    }

    const session = await getServerSession(request, response, authOptions);
    if (!session) {
      response.status(401).json({error: 'Not logged in'});
      return;
    }

    try {
      const provider = request.body.provider;
      const modelArchitecture = request.body.modelArchitecture;
      const epochs = request.body.epochs;
      const templateData = request.body.templateData;

      console.log(request.body);

      await mongoClient.connect();
      const db = mongoClient.db("sharpen");

      const providerModel = await db
        .collection("providerModels")
        .findOne({provider: provider, finetuneName: modelArchitecture});

      const estimatedCost = (templateData.numTrainWords + templateData.numValWords)*4/3*epochs/1000*providerModel.trainingCost;

      response.status(200).json({"estimatedCost":estimatedCost.toFixed(2)});

    } catch (e) {
      console.error(e);
      response.status(400).json({ error: e })
    }
  }
