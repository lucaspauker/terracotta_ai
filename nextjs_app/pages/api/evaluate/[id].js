import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"

import Evaluation from '../../../schemas/Evaluation';
import User from '../../../schemas/User';
import Dataset from '../../../schemas/Dataset';
import Model from '../../../schemas/Model';
import Template from '../../../schemas/Template';
import ProviderModel from '../../../schemas/ProviderModel';

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
    if (!user) { throw createError(400, 'User not found'); }

    const evaluation =  await Evaluation.findOne({_id: id, userId: user._id});
    if (!evaluation) { throw createError(400, 'Evaluation not found'); }

    const dataset =  await Dataset.findOne({_id: evaluation.datasetId});
    const model =  await Model.findOne({_id: evaluation.modelId});
    let modelTemplate;
    if (model) modelTemplate =  await Template.findOne({_id: model.templateId});
    const template =  await Template.findOne({_id: evaluation.templateId});
    const providerModel =  await ProviderModel.findOne({_id: evaluation.providerModelId});

    const ret = {
      _id: evaluation._id,
      name: evaluation.name,
      description: evaluation.description,
      datasetId: evaluation.datasetId,
      modelId: evaluation.modelId,
      datasetName: dataset.name,
      modelName: model && model.name,
      metrics: evaluation.metrics,
      metricResults: evaluation.metricResults,
      trainingEvaluation: evaluation.trainingEvaluation,
      templateString: template && template.templateString,
      classes: modelTemplate && modelTemplate.classes || template.classes,
      completionName: providerModel && providerModel.completionName,
    }

    response.status(200).send(ret);
  } catch (error) {
    console.log(error);
    if (!error.status) {
      error = createError(500, 'Error creating evaluation');
    }
    response.status(error.status).json({ error: error.message });
  }
}
