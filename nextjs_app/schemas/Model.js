import { Schema, model, models} from 'mongoose';

const modelSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  provider: {
    type: String,
    enum: ['openai', 'cohere'],
    required: true
  },
  modelArchitecture: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
  },
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: 'datasets'
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'projects',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  providerData: Schema.Types.Mixed,
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'templates',
  },
  cost: Number,
  timeCreated: {
    type: Date,
    default: Date.now
  }
});

export default models.models|| model('models', modelSchema);