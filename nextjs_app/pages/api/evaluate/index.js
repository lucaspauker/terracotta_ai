import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI);

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
    const projectName = request.body.projectName;

    await client.connect();
    const db = client.db("sharpen");

    const user = await db
      .collection("users")
      .findOne({email: session.user.email});
    const userId = user._id;

    const project = await db
      .collection("projects")
      .findOne({userId: userId, name: projectName});
    if (!project) {
      response.status(400).json({ error: 'Project not found' });
      return;
    }
    const projectId = project._id;

    console.log(projectId);
    const evals = await db.collection("evaluations")
      .aggregate([
        {
          $match: { userId: userId, projectId: projectId }
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
          },
        },
        {
          $lookup: {
            from: "providerModels",
            localField: "providerModelId",
            foreignField: "_id",
            as: "providerModel"
          },
        },
        {
          $unwind: { path: "$dataset", preserveNullAndEmptyArrays: false }
        },
        {
          $unwind: { path: "$model", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$providerModel", preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            _id: "$_id",
            name: "$name",
            datasetId: "$dataset._id",
            datasetName: "$dataset.name",
            modelId: "$model._id",
            modelName: "$model.name",
            providerCompletionName: "$providerModel.completionName",
            description: "$description",
            metrics: "$metrics",
            metricResults: "$metricResults",
            trainingEvaluation: "$trainingEvaluation",
            timeCreated: "$timeCreated",
            status: "$status",
            cost: "$cost",
          }
        }
      ])
      .sort({timeCreated: -1})
      .toArray();

    response.status(200).json(evals);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
