import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
const ObjectId = require('mongodb').ObjectId;
const mongoose = require('mongoose');
import Project from '../../../../schemas/Project';  
const createError = require('http-errors');

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

    const project = await Project.findByIdAndDelete(id);
    console.log(project);
    if (!project) {
      throw createError(400,'Project not found');
    }

    response.status(200).send();
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error creating project');
    }
    response.status(error.status).json({ error: error.message });
  }
}
