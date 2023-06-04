import { getServerSession } from "next-auth/next"
import { authOptions } from "@/auth/[...nextauth]"

import ProviderModel from "@/schemas/ProviderModel";
import User from "@/schemas/User";
import Dataset from "@/schemas/Dataset";

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
      // Assume the model is a finetuned model for now
      const provider = request.body.provider;
      const modelArchitecture = request.body.modelArchitecture;
      const templateData = request.body.templateData;
      const datasetId = request.body.datasetId;

      await mongoose.connect(process.env.MONGOOSE_URI);

      const providerModel = await ProviderModel.findOne({provider: provider, finetuneName: modelArchitecture});
      if (!providerModel) {
        throw createError(400, 'Provider model not found');
      }

      let estimatedCost = (templateData.numValTokens / 1000) * providerModel.finetuneCompletionCost;

      response.status(200).json({"estimatedCost":estimatedCost.toFixed(2)});

    } catch (error) {
      console.log(error);
      if (!error.status) {
        error = createError(500, 'Error estimating cost');
      }
      response.status(error.status).json({ error: error.message });
    }
  }
