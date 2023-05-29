import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import Project from '../../../schemas/Project'; 
import User from '../../../schemas/User';  

const createError = require('http-errors');
const mongoose = require('mongoose');

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

  let projectName = request.body.projectName;

  try {

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    console.log(user);
    const p = await Project.findOne({userId: userId, name: projectName});

    console.log(p);

    if (!p) {
      throw createError(400,'Project not found');
    }

    response.status(200).json(p);
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error retrieving project related info');
    }
    response.status(error.status).json({ error: error.message });
  }
}
