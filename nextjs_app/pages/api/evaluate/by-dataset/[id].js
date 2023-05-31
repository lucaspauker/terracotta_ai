import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

import Evaluation from '../../../../schemas/Evaluation';
import User from '../../../../schemas/User';

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

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    const evals = await Evaluation.find({datasetId:id, userId: user._id});

    response.status(200).json(evals);
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error displaying evaluations');
    }
    response.status(error.status).json({ error: error.message });
  }
}
