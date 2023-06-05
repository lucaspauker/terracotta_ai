import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
const createError = require('http-errors');
const mongoose = require('mongoose');
import Project from '../../../schemas/Project';
import User from '../../../schemas/User';
import Dataset from '../../../schemas/Dataset';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

  const projectName = request.body.projectName;

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {
    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    const project = await Project.findOne({userId: userId, name: projectName});
    if (!project) {
      throw createError(400,'Project not found');
    }

    const datasets = await Dataset
      .find({userId: userId, projectId: project._id})
      .sort({timeCreated: -1});

    response.status(200).json(datasets);
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error creating dataset');
    }
    response.status(error.status).json({ error: error.message });
  }
}
