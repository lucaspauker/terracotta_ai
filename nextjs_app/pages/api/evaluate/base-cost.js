import { getServerSession } from "next-auth/next"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

import ProviderModel from "@/schemas/ProviderModel";
import Model from "@/schemas/Model";
import User from "@/schemas/User";

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
      await mongoose.connect(process.env.MONGOOSE_URI);

      const modelName = request.body.modelName;
      const templateData = request.body.templateData;

      const providerModel = await ProviderModel.findOne({completionName: modelName});

      // Eval cost
      let estimatedCost = (templateData.numValTokens / 1000) * providerModel.completionCost;

      response.status(200).json({"estimatedCost":estimatedCost.toFixed(2)});

    } catch (error) {
      console.log(error);
      if (!error.status) {
        error = createError(500, 'Error estimating cost');
      }
      response.status(error.status).json({ error: error.message });
    }
  }
