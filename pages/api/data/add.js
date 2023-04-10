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
    await client.connect();
    const db = client.db("sharpen");

    const name = request.body.name;
    const description = request.body.description;
    const project_id = request.body.project_id;
    const filename = request.body.filename;
    const trainFileName = request.body.trainFileName;
    const initialTrainFileName = request.body.initialTrainFileName;
    const valFileName = request.body.valFileName;
    const initialValFileName = request.body.initialValFileName;
    const datetime = request.body.datetime;
    const projectName = request.body.projectName;

    if (name === '') {
      response.status(400).json({ error: 'Must specify a name' })
      return;
    }
    if (filename === '') {
      response.status(400).json({ error: 'Must provide a file' })
      return;
    }

    // Get user ID
    const filtered_user = await db
      .collection("users")
      .findOne({email: session.user.email});
    const user_id = filtered_user._id;
    if (user_id === '') {
      response.status(400).json({ error: 'Must specify user' })
      return;
    }

    // Get project ID
    const project = await db
      .collection("projects")
      .findOne({userId: user_id, name: projectName});
    if (!project) {
      response.status(400).json({ error: 'Project not found' });
      return;
    }

    const filtered_dataset = await db
      .collection("datasets")
      .findOne({name: name, projectId: project._id});
    if (filtered_dataset) {
      response.status(400).json({error:"Dataset name already exists, pick a unique name."});
      return;
    }

    const d = await db
      .collection("datasets")
      .insertOne({
          name: name,
          description: description,
          userId: user_id,
          projectId: project._id,
          fileName: filename,
          trainFileName: trainFileName,
          initialTrainFileName: initialTrainFileName,
          valFileName: valFileName,
          initialValFileName: initialValFileName,
          timeCreated: datetime,
        });
    console.log(d);
    response.status(200).json(d);

  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
