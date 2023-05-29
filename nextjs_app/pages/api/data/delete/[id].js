import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import Project from '../../../../schemas/Project';  
import User from '../../../../schemas/User';
import Dataset from '../../../../schemas/Dataset';

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

    await mongoose.connect(process.env.MONGOOSE_URI);

    await Dataset.findByIdAndDelete(id);

    response.status(200).send();
  } catch (error) {
    console.error(error);
    if (!error.status) {
      error = createError(500, 'Error deleting dataset');
    }
    response.status(error.status).json({ error: error.message });
  }
}
