import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { MongoClient } from 'mongodb';
const ObjectId = require('mongodb').ObjectId;
const client = new MongoClient(process.env.MONGODB_URI);

const cohere = require('cohere-ai');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
    return;
  }

  const modelId = request.body.providerData?.modelId;
  const completionName = request.body.completionName;
  const prompt = request.body.prompt;
  const projectName = request.body.projectName;

  const session = await getServerSession(request, response, authOptions);
  if (!session) {
    response.status(401).json({error: 'Not logged in'});
    return;
  }

  try {
    await client.connect();
    const db = client.db("sharpen");

    // Get user in order to keep track of history
    const user = await db
      .collection("users")
      .findOne({email: session.user.email});
    if (!user) {
      response.status(400).json({ error: 'User not found' });
      return;
    }

    const project = await db
        .collection("projects")
        .findOne({userId: user._id, name: projectName});
      if (!project) {
        response.status(400).json({ error: 'Project not found' });
        return;
      }

    // Configure cohere with user API key
    cohere.init(user.cohereKey);


    if (completionName) {
      console.log("shouldnt be here");
      if (completionName.startsWith("generate")) {

          const generateResponse = await cohere.generate({
              prompt: prompt,
              max_tokens: 50,
              model: completionName.split('-')[1]
          });

          const output = generateResponse.body.generations[0].text;

          response.status(200).json(output);

      } else if (completionName.startsWith("classify")) {
          response.status(200).json({"output":"Classification not supported yet"});
      } else {
          response.status(400).json({ error: 'Invalid model type' });
      }
    } else {

      if (project.type === "classification") {
        const inputs = [];
        inputs.push(prompt);
        const cohereResponse = await cohere.classify({
          model: modelId,
          inputs: inputs
        });
        const output = cohereResponse.body.classifications[0].prediction;
        response.status(200).json(output);
      } else {
        const cohereResponse = await cohere.generate({
          model: modelId,
          prompt: prompt
        });
        const output = cohereResponse.body.generations[0].text;
        response.status(200).json(output);
      }
      

      


      
    }
  } catch (e) {
    console.error(e);
    response.status(400).json({ error: e })
  }
}
