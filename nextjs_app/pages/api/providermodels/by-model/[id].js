import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

import User from '../../../../schemas/User';
import ProviderModel from '../../../../schemas/ProviderModel';
import Model from '../../../../schemas/Model';

const createError = require('http-errors');
const mongoose = require('mongoose');

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
    await mongoose.connect(process.env.MONGOOSE_URI);

    // Get user in order to keep track of history
    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400, 'User not found');
    }

    const model = await Model.findOne({_id: id, userId: user._id});
    if (!model) {
      throw createError(400, 'Model not found');
    }

    const pmodel = await ProviderModel.findOne({finetuneName: model.modelArchitecture});
    if (!pmodel) {
      throw createError(400, 'Provider model not found');
    }


    response.status(200).json(pmodel);
  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error retrieving completion');
    }
    response.status(error.status).json({ error: error.message });
  }
}
