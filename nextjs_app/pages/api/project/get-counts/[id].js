import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

import User from '@/schemas/User';
import Model from '@/schemas/Model';
import Dataset from '@/schemas/Dataset';
import Evaluation from '@/schemas/Evaluation';

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

  const { id } = request.query;

  try {

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400, 'User not found');
    }

    const [modelCount, datasetCount, evaluationCount] = await Promise.all([
      Model.count({ projectId: id }),
      Dataset.count({ projectId: id }),
      Evaluation.count({ projectId: id }),
    ]);

    response.status(200).json({modelCount: modelCount, datasetCount: datasetCount, evaluationCount: evaluationCount});
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error creating project');
    }
    response.status(error.status).json({ error: error.message });
  }
}
