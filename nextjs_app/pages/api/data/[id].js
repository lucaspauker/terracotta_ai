import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import Project from '@/schemas/Project';
import User from '@/schemas/User';
import Dataset from '@/schemas/Dataset';

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

    const d = await Dataset.findOne({_id: id, userId: user._id});
    if (!d) {
      throw createError(400, 'Dataset not found')
    }

    if (String(d.userId) !== String(user._id)) {
      throw createError(401, "Not authorized");
    }

    response.status(200).json(d);
  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error creating dataset');
    }
    response.status(error.status).json({ error: error.message });
  }
}
