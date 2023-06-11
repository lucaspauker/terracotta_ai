import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import Project from '@/schemas/Project';
import User from '@/schemas/User';
import Dataset from '@/schemas/Dataset';
import Model from "@/schemas/Model";
import Template from "@/schemas/Template";

const createError = require('http-errors');
const mongoose = require('mongoose');
const csv = require('csvtojson');
const tmp = require('tmp');

const S3_BUCKET = process.env.PUBLIC_S3_BUCKET;
const REGION = process.env.PUBLIC_S3_REGION;
const client = new S3Client({ region: REGION });

const { Configuration, OpenAIApi } = require("openai");

const fs = require('fs');

async function downloadFile(data, filename) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filename);
    data.forEach(value => writeStream.write(`${JSON.stringify(value)}\n`));
    writeStream.on('finish', () => {
      writeStream.close();
      resolve();
    });
    writeStream.on('error', (err) => {
      console.error('There was an error writing the file:', err);
      reject(err);
    });
    writeStream.end();
  });
}

function deleteTemporaryFile(filename) {
  fs.unlink(filename, (err) => {
    if (err) {
      console.error('Error deleting temporary file:', err);
    } else {
      console.log('Temporary file deleted successfully');
    }
  });
}

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

  // Don't return a status twice
  let newModelId = null;
  try {
    const provider = request.body.provider;
    const modelArchitecture = request.body.modelArchitecture;
    const datasetName = request.body.dataset;
    const modelName = request.body.modelName;
    const description = request.body.description;
    const projectName = request.body.projectName;
    let hyperParams = request.body.hyperParams;
    const templateString = request.body.templateString;
    const templateData = request.body.templateData;
    const outputColumn = request.body.outputColumn;
    const stopSequence = request.body.stopSequence;

    for (const [key, value] of Object.entries(hyperParams)){
      if (hyperParams[key] === null) {
        delete hyperParams[key];
      } else {
        hyperParams[key] = Number(value);
      }
    }

    await mongoose.connect(process.env.MONGOOSE_URI);

    const user =  await User.findOne({email: session.user.email});
    if (!user) {
      throw createError(400,'User not found');
    }
    const userId = user._id;

    // Configure openai with user API key
    const configuration = new Configuration({
      apiKey: user.openAiKey,
    });
    const openai = new OpenAIApi(configuration);

    const project = await Project.findOne({userId: userId, name: projectName});

    if (!project) {
      throw createError(400,'Project not found');
    } else if (project.type !== "generative" && project.type !== "classification") {
      throw createError(400,'Only classification and generation are supported');
    }

    let dataset = await Dataset.findOne({projectId: project._id, name: datasetName});

    if (!dataset) {
      throw createError(400,'Dataset not found');
    }

    // Create model in db, then we will fill in provider data later

    const model = await Model.create({
      name: modelName,
      description: description,
      provider: provider,
      modelArchitecture: modelArchitecture,
      status: "preparing",
      datasetId: dataset._id,
      projectId: project._id,
      userId: userId,
      providerData: {},
    });
    newModelId = model._id;
    response.status(200).send();

    // Only download from S3 and upload to openai once
    let valFilePresent = false;

    const regex = /{{.*}}/g;
    const matches = templateString.match(regex);
    const matchesStrings = [...new Set(matches.map(m => m.substring(2, m.length - 2)))];

    let template = {};

    const trainFileName = dataset.trainFileName;
    const valFileName = dataset.valFileName;
    valFilePresent = valFileName && valFileName !== undefined;

    // Download files from S3

    const params = {
      Bucket: S3_BUCKET,
      Key: 'raw_data/' + trainFileName,
    }

    const command = new GetObjectCommand(params);
    const s3Response = await client.send(command);
    const stream = s3Response.Body;
    const trainJson = await csv({trim:false}).fromStream(stream);
    let valJson = {};

    if (valFilePresent) {
      const params = {
        Bucket: S3_BUCKET,
        Key: 'raw_data/' + valFileName,
      }

      const command = new GetObjectCommand(params);
      const s3Response = await client.send(command);
      const stream = s3Response.Body;
      valJson = await csv({trim:false}).fromStream(stream);
    }

    let classes = [];

    const templateTransform = (row) => {
      if (project.type === "classification") {
        classes.push(row[outputColumn]);
      }
      let prompt = templateString;
      matches.forEach((match) => {
        prompt = prompt.replace(match, row[match.replace('{{','').replace('}}','')]);
      });
      return {prompt: prompt, completion: row[outputColumn] + stopSequence};
    }

    let trainData = trainJson.map((row) => {
      return templateTransform(row);
    });

    let valData = {};
    if (valFilePresent) {
      valData = valJson.map((row) => {
        return templateTransform(row);
      });
    }

    // Get unique classes
    classes = Array.from(new Set(classes));

    // Create map of classes to ids
    let classMap = {}
    let reverseClassMap = {}
    for (let i=0; i<classes.length; i++) {
      const tok = " " + String(i);
      classMap[tok] = classes[i];
      reverseClassMap[classes[i]] = tok;
    }

    // Go through trainData and replace completions with classMapped strings
    if (classes.length > 0) {
      trainData = trainData.map((row) => {
        return {...row, completion: reverseClassMap[row.completion.substring(0, row.completion.length - stopSequence.length)] + stopSequence};
      });
      if (valFilePresent) {
        valData = valData.map((row) => {
          return {...row, completion: reverseClassMap[row.completion.slice(0,-1 * stopSequence.length)] + stopSequence};
        });
      }
    }

    template = await Template.create({
      templateString: templateString,
      templateData: templateData,
      outputColumn: outputColumn,
      datasetId: dataset._id,
      classes: classes.length > 1? classes : null,
      classMap: classMap,
      stopSequence: stopSequence,
      fields: matchesStrings,
    });

    console.log(template);

    const trainFileJsonl = tmp.tmpNameSync({ postfix: '.jsonl' });
    const valFileJsonl = tmp.tmpNameSync({ postfix: '.jsonl' });

    await downloadFile(trainData, trainFileJsonl);
    if (valFilePresent) {
      await downloadFile(valData, valFileJsonl);
    }

    console.log("Downloaded files");

    const trainResponse = await openai.createFile(
      fs.createReadStream(trainFileJsonl),
      "fine-tune"
    );
    deleteTemporaryFile(trainFileJsonl);

    if (valFilePresent) {
      const valResponse = await openai.createFile(
        fs.createReadStream(valFileJsonl),
        "fine-tune"
      );
      deleteTemporaryFile(valFileJsonl);
      dataset = await Dataset.findByIdAndUpdate(dataset._id,
        {openaiData: {trainFile: trainResponse.data.id, valFile: valResponse.data.id}}, {new: true});
    } else {
      dataset = await Dataset.findByIdAndUpdate(dataset._id, {openaiData: {trainFile: trainResponse.data.id}}, {new: true});
    }

    console.log("Done");

    let finetuneRequest = null;
    if (project.type === "classification") {
      if (classes.length <= 1) {
        throw createError(400,'Dataset classes not specified')
      } else if (classes.length === 2) {  // Binary classification
        finetuneRequest = {
          training_file: dataset.openaiData.trainFile,
          compute_classification_metrics: true,
          classification_positive_class: classes[0] + stopSequence,
          model: modelArchitecture,
        };
        if (valFilePresent) finetuneRequest.validation_file = dataset.openaiData.valFile;
      } else {  // Multiclass classification
        finetuneRequest = {
          training_file: dataset.openaiData.trainFile,
          compute_classification_metrics: true,
          classification_n_classes: classes.length,
          model: modelArchitecture,
        };
        if (valFilePresent) finetuneRequest.validation_file = dataset.openaiData.valFile;
      }
    } else if (project.type === "generative") {
      finetuneRequest = {
        training_file: dataset.openaiData.trainFile,
        model: modelArchitecture,
      };
    }

    // Create finetune
    finetuneRequest = {...finetuneRequest,...hyperParams};
    const finetuneResponse = await openai.createFineTune(finetuneRequest);

    await Model.findByIdAndUpdate(
      model._id,
      {
        status: "training",
        providerData: {
          finetuneId: finetuneResponse.data.id,
          hyperParams: hyperParams
        },
        templateId: template._id
      }
    );

    response.status(200).send();

  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      error = createError(400, 'Another model with the same name exists in this project');
      response.status(error.status).json({ error: error.message });
    } else {
      if (newModelId) {
        await Model.findByIdAndUpdate(newModelId, {status: "failed"})
      }
    }
  }
}

