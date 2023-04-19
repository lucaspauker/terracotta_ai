const { MongoClient } = require('mongodb');
const mongoClient = new MongoClient("mongodb://127.0.0.1");

async function initializeDatabase() {
    await mongoClient.connect();
    const db = mongoClient.db("sharpen");

    await db.collection("providerModels").drop();

    await db
        .collection("providerModels")
        .insertMany([
                {
                    finetuneName: "ada",
                    completionName: "text-ada-001",
                    provider: "openai",
                    trainingCost: 0.0004,
                    completionCost: 0.0016
                },
                {
                    finetuneName: "babbage",
                    completionName: "text-babbage-001",
                    provider: "openai",
                    trainingCost: 0.0006,
                    completionCost: 0.0024
                },
                {
                    finetuneName: "curie",
                    completionName: "text-curie-001",
                    provider: "openai",
                    trainingCost: 0.0030,
                    completionCost: 0.0120
                },
                {
                    finetuneName: "davinci",
                    completionName: "text-davinci-003",
                    provider: "openai",
                    trainingCost: 0.0300,
                    completionCost: 0.1200
                }
        ]);
        mongoClient.close();
}

initializeDatabase();