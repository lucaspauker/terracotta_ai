import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import {templateTransform} from '../../../utils/template';

import Project from '../../../schemas/Project';  
import User from '../../../schemas/User';
import Template from '../../../schemas/Template';

const createError = require('http-errors');
const mongoose = require('mongoose');

const cohere = require('cohere-ai');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

  const modelId = request.body.providerData?.modelId;
  const completionName = request.body.completionName;
  const prompt = request.body.prompt;

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

    // Configure cohere with user API key
    cohere.init(user.cohereKey);

    const generateResponse = await cohere.generate({
      prompt: prompt,
      max_tokens: 50,
      model: completionName.split('-')[1]
    });

    const output = generateResponse.body.generations[0].text;

    response.status(200).json(output);
    return;
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error retrieving completion');
    }
    response.status(error.status).json({ error: error.message });
  }
}
