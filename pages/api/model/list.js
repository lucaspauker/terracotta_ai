import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI);

const { Configuration, OpenAIApi } = require("openai");

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

    // Configure openai with user API key
    const configuration = new Configuration({
      apiKey: user.openAiKey,
    });
    const openai = new OpenAIApi(configuration);

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
      models[i]["datasetId"] = dataset._id;

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
            .updateOne({"_id" : model._id},
            {$set: { "status" : "succeeded", "providerModelName": finetuneResponse.fine_tuned_model}});
        } else if (finetuneResponse.status === "failed") {
          models[i]["status"] = "failed";
          await db
            .collection("models")
            .updateOne({"_id" : model._id},
            {$set: { "status" : "failed", "providerModelName": finetuneResponse.fine_tuned_model}});
          continue;
        } else {
          // Check last event to update status
          const lastMessage = events[events.length - 1]['message'];
          if (events.length <= 3 || lastMessage.startsWith("Fine-tune is in the queue")
            || lastMessage.startsWith("Fine-tune costs")) {
            models[i]["status"] = "queued for training";
          } else if (lastMessage === "Fine-tune started") {
            models[i]["status"] = "training started";
          } else if (lastMessage.startsWith("Completed epoch")) {
            models[i]["status"] = lastMessage;
          } else if (lastMessage.startsWith("Uploaded")) {
            models[i]["status"] = "creating model endpoint";
          } else {
            models[i]["status"] = "";
          }
        }

        // Cost update
        if (!("cost" in models[i]) && events.length > 1) {
          const costEvent = events[1];
          if (costEvent["message"].startsWith("Fine-tune costs")) {
            const cost = parseFloat(costEvent["message"].split('$')[1]);
            models[i]["cost"] = cost;
            await db
              .collection("models")
              .updateOne({"_id" : model._id},
              {$set: { "cost" : cost}});
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
