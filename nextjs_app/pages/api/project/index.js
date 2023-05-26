import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import Project from '../../../schemas/Project';
import User from '../../../schemas/User';

const mongoose = require('mongoose');

//const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(400).json({ error: 'Use GET request' })
  }

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    console.log(user);
    if (!user) {
      response.status(400).json({ error: 'User not found' });
      return;
    }

    const projects = await Project.find({userId: user._id});
    if (!projects) {
      response.status(400).json({ error: 'Projects not found' });
    }

    response.status(200).json(projects);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
