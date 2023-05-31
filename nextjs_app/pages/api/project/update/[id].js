import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
const createError = require('http-errors');
const mongoose = require('mongoose');
import Project from '../../../../schemas/Project'; 

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
    const name = request.body.name;

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    const project = await Project.updateOne({_id: id, userId: user._id}, {name: name});
    if (!project) {
      throw createError(400,'Project not found');
    }

    response.status(200).send(project);
    return;
  } catch (error) {
    if (error.code === 11000) {
      error = createError(400, 'Project name already exists');
    } else if (!error.status) {
      error = createError(500, 'Error creating project');
    }
    response.status(error.status).json({ error: error.message });
  }
}
