const { MongoClient } = require('mongodb');
const mongoClient = new MongoClient("mongodb://127.0.0.1");

async function migrate() {
    await mongoClient.connect();
    const db = mongoClient.db("sharpen");

    const models = await db.collection("models").find().toArray();
    const newModels = [];

    for (let model of models) {
        const providerData = {
            modelId: model.providerModelName, 
            finetuneId: model.providerModelId, 
            hyperParams: model.hyperParams,
        }
        delete model.providerModelName;
        delete model.providerModelId;
        delete model.hyperParams;
        model.providerData = providerData;
        newModels.push(model);
    }
    

    await db.collection("models").drop();

    await db.collection("models").insertMany(newModels);
    
    mongoClient.close();
}

migrate();