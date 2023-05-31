import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

const ObjectId = require('mongodb').ObjectId;
const mongoose = require('mongoose');
const createError = require('http-errors');

import Project from '../../../../schemas/Project';
import Dataset from '../../../../schemas/Dataset';
import Model from '../../../../schemas/Model';
import Evaluation from '../../../../schemas/Evaluation';
import User from '../../../../schemas/User';

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

  const { id } = request.query;

  try {
    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    await Dataset.deleteMany({projectId: id, userId: user._id});
    await Model.deleteMany({projectId: id, userId: user._id});
    await Evaluation.deleteMany({projectId: id, userId: user._id});

    const project = await Project.deleteOne({_id: id, userId: user._id});
    console.log(project);
    if (!project) {
      throw createError(400,'Project not found');
    }

    response.status(200).send();
  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error creating project');
    }
    response.status(error.status).json({ error: error.message });
  }
}
