import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import ProviderModel from '../../../schemas/ProviderModel';

const createError = require('http-errors');
const mongoose = require('mongoose');

export default async function handler(request, response) {
    if (request.method !== 'GET') {
      response.status(400).json({ error: 'Use GET request' })
    }
  
    const session = await getServerSession(request, response, authOptions);
    if (!session) {
      response.status(401).json({error: 'Not logged in'});
      return;
    }
  
    try {

      await mongoose.connect(process.env.MONGOOSE_URI);

      const providerModels = await ProviderModel.find({});
  
      response.status(200).json(providerModels);
    } catch (error) {
      if (!error.status) {
        error = createError(500, 'Error retrieving completion');
      }
      response.status(error.status).json({ error: error.message });
    }
  }