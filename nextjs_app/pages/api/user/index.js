import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import User from '../../../schemas/User';

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

  try {
    
    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    response.status(200).json(user);
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error retrieving user');
    }
    response.status(error.status).json({ error: error.message });
  }
}
