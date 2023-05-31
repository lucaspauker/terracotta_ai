import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

const ObjectId = require('mongodb').ObjectId;
const mongoose = require('mongoose');

import User from '../../../schemas/User';
import Project from '../../../schemas/Project';

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
      throw createError(400,'User not found');
    }

    const project = await Project.findOne({_id: id, userId: user._id});
    if (!project) {
      response.status(400).json({error:"Project not found!"});
      return;
    }

    response.status(200).send(project);
    return;
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
