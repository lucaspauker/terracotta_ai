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

    for (let i=0; i<models.length; i++) {
      let model = models[i];
      const dataset = await db
        .collection("datasets")
        .findOne({_id: model.datasetId});
      models[i]["datasetName"] = dataset.name;

      if (model.status !== "succeeded") {
        let finetuneResponse = await openai.retrieveFineTune(model.providerModelId);
        console.log(finetuneResponse.data);
        
        finetuneResponse = finetuneResponse.data;
        const events = finetuneResponse.events;
        if (finetuneResponse.status === "succeeded") {
          models[i]["status"] = "succeeded";
          models[i]["providerModelName"] = finetuneResponse.fine_tuned_model;
          await db
            .collection("models")
            .updateOne({"providerModelId" : model.providerModelId},
            {$set: { "status" : "succeeded", "providerModelName": finetuneResponse.fine_tuned_model}});
        } else {
          // Cost update
          if (!("cost" in models[i]) && events.length > 1) {
            const costEvent = events[1];
            if (costEvent["message"].startsWith("Fine-tune costs")) {
              const cost = parseFloat(costEvent["message"].split('$')[1]);
              models[i]["cost"] = cost;
              await db
                .collection("models")
                .updateOne({"providerModelId" : model.providerModelId},
                {$set: { "cost" : cost}}); 
            }
          }
          // Check last event to update status
          const lastMessage = events[events.length - 1]['message'];
          if (events.length <= 3 || lastMessage.startsWith("Fine-tune is in the queue")) {
            models[i]["status"] = "Queued for training";
            continue;
          } else if (lastMessage === "Fine-tune started") {
            models[i]["status"] = "Training started";
            continue;
          } else if (lastMessage.startsWith("Completed epoch")) {
            models[i]["status"] = lastMessage;
            continue;
          } else {
            models[i]["status"] = "Uploading model"
          }
        }
      }
    }

    response.status(200).json(models);
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
