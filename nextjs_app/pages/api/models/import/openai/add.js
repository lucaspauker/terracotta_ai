import { getServerSession } from "next-auth/next"
import { authOptions } from  "../../../auth/[...nextauth]"

import User from '@/schemas/User';
import Project from '@/schemas/Project';
import Model from "@/schemas/Model";

const createError = require('http-errors');
const mongoose = require('mongoose');

const path = require('path');

const { Configuration, OpenAIApi } = require("openai");

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
      const projectName = request.body.projectName;
      const modelName = request.body.modelName;
      const model = request.body.model;

      console.log(request.body);

      await mongoose.connect(process.env.MONGOOSE_URI);

      const user =  await User.findOne({email: session.user.email});
      if (!user) {
        throw createError(400,'User not found');
      }
      const userId = user._id;

      const project = await Project.findOne({userId: user._id, name: projectName});
      if (!project) {
        response.status(400).json({ error: 'Project not found' });
        return;
      }

      // TODO: Retrieve cost from openai

      const d = await Model.create({
        name: modelName,
        provider: "openai",
        modelArchitecture: model.model,
        status: "imported",
        datasetId: null,
        projectId: project._id,
        userId: userId,
        cost: null,
        providerData: {
          finetuneId: model.id,
          modelId: model.fine_tuned_model,
          hyperParams: model.hyperParams
        }
      });

      response.status(200).send();
  
    } catch (error) {
      console.log(error);
      if (error.code === 11000) {
        error = createError(400, 'Another model with the same name exists in this project');
      } else if (!error.status) {
        error = createError(500, 'Error importing model');
      }
      response.status(error.status).json({ error: error.message });
    }
  }
