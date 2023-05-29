import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import User from '../../../schemas/User';

const createError = require('http-errors');
const mongoose = require('mongoose');

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

    const apiKey = request.body.apiKey;
    const update = request.body.update;
    let updateSet = {};
    if (update === "openai") {
      updateSet["openAiKey"] = apiKey;
    } else if (update === "cohere") {
      updateSet["cohereKey"] = apiKey;
    }


    // Get user ID
    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    await User.findByIdAndUpdate(userId, updateSet);

    console.log("User API keys successfully added");
    response.status(200).json();
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error saving api key');
    }
    response.status(error.status).json({ error: error.message });
  }
}
