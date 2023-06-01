import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import ProviderModel from "../../../../schemas/ProviderModel";
import User from "../../../../schemas/User";

import {templateTransform} from "../../../../utils/template";
const createError = require('http-errors');
const {encode, decode} = require('gpt-3-encoder')

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

    try {
      const data = request.body.data;
      const template = request.body.template;
      const outputColumn = request.body.outputColumn;
      const stopSequence = request.body.stopSequence;

      // We will use the N examples in data to estimate cost for M total data points
      const totalDataPoints = request.body.totalDataPoints;

      let numTokens = 0;
      numTokens += encode(stopSequence).length * data.length;
      data.forEach((row) => {
        numTokens += encode(templateTransform(template, row)).length;
        numTokens += encode(row[outputColumn]).length;
      });

      numTokens = numTokens * (totalDataPoints / data.length);

      response.status(200).json({"numTokens": numTokens});

    } catch (error) {
      if (!error.status) {
        error = createError(500, 'Error estimating cost');
      }
      response.status(error.status).json({ error: error.message });
    }
  }
