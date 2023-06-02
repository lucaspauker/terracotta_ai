import { Schema, model, models} from 'mongoose';

const evaluationSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: 'datasets',
    required: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'projects',
    required: true
  },
  modelId: {
    type: Schema.Types.ObjectId,
    ref: 'models',
    required: function () {
        return !this.providerModelId;
    }
  },
  providerModelId : {
    type: Schema.Types.ObjectId,
    ref: 'providerModels',
    required: function () {
      return !this.modelId;
    }
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'templates',
  },
  metrics: {
    type: [String],
    required: true
  },
  metricResults: {
    type: Schema.Types.Mixed,
    validate: {
      validator: function (dict) {
        if (!dict) {
          return true;
        }
        const keys = this.metrics;
        for (const key of keys) {
          if (!(key in dict)) {
            return false;
          }
        }
        return true;
      },
      message: 'The dictionary keys must match the values in the "keys" field.'
    }
  },
  trainingEvaluation: {
    type: Boolean,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  timeCreated: {
    type: Date,
    default: Date.now
  },
  parameters: {
    type: Schema.Types.Mixed,
  },
  cost: Number,
});

export default models.evaluations || model('evaluations', evaluationSchema);
