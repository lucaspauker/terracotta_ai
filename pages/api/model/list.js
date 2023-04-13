import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI);

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

    const models = await db
      .collection("models")
      .find({userId: userId, projectId: projectId})
      .toArray();

    let modelList = [];

    for (let i=0; i<models.length; i++) {
      let model = models[i];
      models[i]["status"] = "succeeded";
      if (model.status == "training") {
        const finetuneResponse = await openai.retrieveFineTune(model.providerModelId);
        console.log(finetuneResponse.data);
        if (finetuneResponse.data.status == "succeeded") {
          await db
            .collection("models")
            .updateOne({"providerModelId" : model.providerModelId},
            {$set: { "status" : "succeeded"}});
        } else {
          models[i]["status"] = "training";
        }
      }
    }

    response.status(200).json(models);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
