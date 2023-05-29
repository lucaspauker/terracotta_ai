import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import ProviderModel from "../../../../schemas/ProviderModel";
import User from "../../../../schemas/User";
const createError = require('http-errors');
const mongoose = require('mongoose');

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

      await mongoose.connect(process.env.MONGOOSE_URI);

      const providerModel = await ProviderModel.findOne({provider: provider, finetuneName: modelArchitecture});

      const estimatedCost = (templateData.numTrainWords + templateData.numValWords)*4/3*epochs/1000*providerModel.trainingCost;

      response.status(200).json({"estimatedCost":estimatedCost.toFixed(2)});

    } catch (error) {
      if (!error.status) {
        error = createError(500, 'Error estimating cost');
      }
      response.status(error.status).json({ error: error.message });
    }
  }
