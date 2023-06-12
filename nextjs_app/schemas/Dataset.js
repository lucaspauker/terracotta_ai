import { Schema, model, models } from 'mongoose';

const openaiDataSchema = new Schema({
  trainFile: {
    type: String,
    required: true
  },
  valFile: String,
});

const datasetSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  headers: [String],
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'projects',
    required: true,
  },
  initialTrainFileName: {
    type: String,
    required: true
  },
  trainFileName: {
    type: String,
    required: true
  },
  initialValFileName: String,
  valFileName: String,
  numTrainExamples: {
    type: Number,
    required: true
  },
  numValExamples: Number,
  openaiData: openaiDataSchema,
  status: String,
  timeCreated: {
    type: Date,
    default: Date.now
  }
});

export default models.datasets || model('datasets', datasetSchema);
