import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import Evaluation from '../../../../schemas/Evaluation';

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

    console.log(name);

    await mongoose.connect(process.env.MONGOOSE_URI);

    console.log("connected");

    const e = await Evaluation.findByIdAndUpdate(id,{name:name},{new:true});

    console.log(e);

    if (!e) {
      throw createError(400,'Evaluation not found')
    }

    response.status(200).send(e);
    return;
  } catch (error) {
    if (error.code === 11000) {
      error = createError(400, 'Another evaluation with the same name exists in this project');
    } else if (!error.status) {
      console.log(error);
      error = createError(500, 'Error renaming evaluation');
    }
    response.status(error.status).json({ error: error.message });
  }
}
