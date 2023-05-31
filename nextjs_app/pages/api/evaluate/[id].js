import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

import Evaluation from '../../../schemas/Evaluation';
import User from '../../../schemas/User';

const createError = require('http-errors');
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;

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

    const evaluation = await Evaluation
      .aggregate([
        {
          $match: { _id: new ObjectId(id), userId: user._id }
        },
        {
          $lookup: {
            from: "datasets",
            localField: "datasetId",
            foreignField: "_id",
            as: "dataset"
          }
        },
        {
          $lookup: {
            from: "models",
            localField: "modelId",
            foreignField: "_id",
            as: "model"
          }
        },
        {
          $lookup: {
            from: "templates",
            localField: "templateId",
            foreignField: "_id",
            as: "template"
          }
        },
        {
          $lookup: {
            from: "providerModels",
            localField: "providerModelId",
            foreignField: "_id",
            as: "providerModel"
          }
        },
        {
          $unwind: { path: "$dataset", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$model", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$template", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$providerModel", preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            _id: "$_id",
            name: "$name",
            datasetId: "$datasetId",
            datasetName: "$dataset.name",
            modelId: "$modelId",
            modelName: "$model.name",
            description: "$description",
            metrics: "$metrics",
            metricResults: "$metricResults",
            trainingEvaluation: "$trainingEvaluation",
            templateString: "$template.templateString",
            completionName: "$providerModel.completionName",
          }
        }
    ]);

    if (evaluation.length === 0) {
      throw createError(400, 'Evaluation not found')
    }

    response.status(200).send(evaluation[0]);
    return;
  } catch (error) {
    if (!error.status) {
      error = createError(500, 'Error creating evaluation');
    }
    response.status(error.status).json({ error: error.message });
  }
}
