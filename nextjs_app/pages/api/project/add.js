import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
const createError = require('http-errors');
const mongoose = require('mongoose');
import Project from '../../../schemas/Project';  
import User from '../../../schemas/User';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {

    await mongoose.connect(process.env.MONGOOSE_URI);

    const name = request.body.name;
    const type = request.body.type;

    // Get user ID
    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    const project = await Project.create({
      name: name,
      type: type,
      userId: userId,
    });
    
    response.status(200).json(project);

  } catch (error) {
    if (error.code === 11000) {
      error = createError(400, 'Project name already exists');
    } else if (!error.status) {
      error = createError(500, 'Error creating project');
    }
    response.status(error.status).json({ error: error.message });
  }
}
