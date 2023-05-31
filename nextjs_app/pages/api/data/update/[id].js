import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import Dataset from '../../../../schemas/Dataset';
import User from '../../../../schemas/User';

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

    const dataset = await Dataset.updateOne({_id: id, userId: user._id},{name:name});

    if (!dataset) {
      throw createError(400,'Dataset not found');
    }

    response.status(200).send(dataset);
    return;
  } catch (error) {
    if (error.code === 11000) {
      error = createError(400, 'Another dataset with the same name exists in this project');
    } else if (!error.status) {
      error = createError(500, 'Error renaming dataset');
    }
    response.status(error.status).json({ error: error.message });
  }
}
