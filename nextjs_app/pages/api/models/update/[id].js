import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import Model from "../../../../schemas/Model";

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

    const model = await Model.findByIdAndUpdate(id, {name: name});
    if (!model) {
      response.status(400).json({error:"Model not found!"});
      return;
    }

    response.status(200).send(model);
    return;
  } catch (error) {
    if (error.code === 11000) {
      error = createError(400, 'Another model with the same name exists in this project');
    } else if (!error.status) {
      error = createError(500, 'Error renaming model');
    }
    response.status(error.status).json({ error: error.message });
  }
}
