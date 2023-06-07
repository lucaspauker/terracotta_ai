import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"

import Model from "../../../../schemas/Model";
import User from "../../../../schemas/User";

const createError = require('http-errors');
const mongoose = require('mongoose');

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

  const { id } = request.query;

  try {
    const name = request.body.name;

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }

    const model = await Model.updateOne({_id: id, userId: user._id}, {name: name});
    if (!model) {
      response.status(400).json({error:"Model not found!"});
      return;
    }

    response.status(200).send(model);
    return;
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      error = createError(400, 'Another model with the same name exists in this project');
    } else if (!error.status) {
      error = createError(500, 'Error renaming model');
    }
    response.status(error.status).json({ error: error.message });
  }
}
