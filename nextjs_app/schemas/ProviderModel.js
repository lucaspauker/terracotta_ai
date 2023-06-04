import { Schema, model, models} from 'mongoose';

const providerModelSchema = new Schema({
  finetuneName: {
    type: String,
  },
  completionName: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  trainingCost: {
    type: Number,
  },
  completionCost: {
    type: Number,
  },
  finetuneCompletionCost: {
    type: Number,
  }
},
{ collection: 'providerModels' });

export default models.providerModels || model('providerModels', providerModelSchema);
