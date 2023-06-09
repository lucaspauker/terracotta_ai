import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import {getReturnText, templateTransform} from '@/utils/template';

import User from '../../../schemas/User';
import Template from '../../../schemas/Template';

const createError = require('http-errors');
const mongoose = require('mongoose');

const { Configuration, OpenAIApi } = require("openai");

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

  const prompt = request.body.prompt;
  const model = request.body.model;
  let completionName = request.body.completionName;
  let hyperParams = request.body.hyperParams;
  let finetuneInputData = request.body.finetuneInputData;

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {
    await mongoose.connect(process.env.MONGOOSE_URI);

    // Get user in order to keep track of history
    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    // Configure openai with user API key
    const configuration = new Configuration({
      apiKey: user.openAiKey,
    });
    const openai = new OpenAIApi(configuration);

    let max_tokens = Number(hyperParams.maxTokens);
    let temperature = Number(hyperParams.temperature);

    if (completionName) {  // Stock OpenAI model
      let completion;
      if (completionName === 'gpt-3.5-turbo') {
        completion = await openai.createChatCompletion({
          model: completionName,
          messages: [{role: 'user', content: prompt}],
          max_tokens: max_tokens,
          temperature: temperature,
        });
        response.status(200).json(completion.data.choices[0].message.content);
        return;
      } else {
        completion = await openai.createCompletion({
          model: completionName,
          prompt: prompt,
          max_tokens: max_tokens,
          temperature: temperature,
        });
        response.status(200).json(completion.data.choices[0].text);
        return;
      }
    } else {  // Finetuned model

      const template = await Template.findById(model.templateId._id);
      if (!template) {
        throw createError(400,'Template not found');
      }

      const templateString = template.templateString;

      const completion = await openai.createCompletion({
        model: model.providerData.modelId,
        prompt: templateTransform(templateString, finetuneInputData),
        max_tokens: max_tokens,
        temperature: temperature,
        stop: template.stopSequence,
      });
      const completionText = completion.data.choices[0].text;

      response.status(200).json(getReturnText(template, completionText));
      return;
    }
  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error retrieving completion');
    }
    response.status(error.status).json({ error: error.message });
  }
}
