import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

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
    await client.connect();
    const db = client.db("sharpen");

    const evaluation = await db.collection("evaluations")
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
      ]).toArray();

    if (!evaluation) {
      response.status(400).json({error:"Evaluation not found!"});
      return;
    }

    response.status(200).send(evaluation[0]);
    return;
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
