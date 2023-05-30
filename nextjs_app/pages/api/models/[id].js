import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

import Project from '../../../schemas/Project';
import User from '../../../schemas/User';
import Model from '../../../schemas/Model';

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

    const m = await Model
      .aggregate([
        {
          $match: { _id: new ObjectId(id) }
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
            from: "templates",
            localField: "templateId",
            foreignField: "_id",
            as: "template"
          }
        },
        {
          $unwind: { path: "$dataset", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$template", preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            _id: "$_id",
            name: "$name",
            datasetId: "$datasetId",
            templateId: "$templateId",
            datasetName: "$dataset.name",
            templateString: "$template.templateString",
            stopSequence: "$template.stopSequence",
            outputColumn: "$template.outputColumn",
            description: "$description",
            provider: "$provider",
            timeCreated: "$timeCreated",
            status: "$status",
            modelArchitecture: "$modelArchitecture",
          }
        }
    ]);
    console.log(m);

    if (!m) {
      throw createError(400,'Model not found')
    }

    response.status(200).json(m);
    return;
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
