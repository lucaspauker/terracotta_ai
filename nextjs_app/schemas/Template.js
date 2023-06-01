import { Schema, model, models} from 'mongoose';

const templateDataSchema = new Schema({
  numTrainTokens: Number,
  numValTokens: Number,
})

const templateSchema = new Schema({
  templateString: {
    type: String,
    required: true
  },
  templateData: Schema.Types.Mixed,
  outputColumn: {
    type: String,
    required: true
  },
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: 'datasets',
    required: true
  },
  classes: {
    type: [String]
  },
  stopSequence: {
    type: String,
    required: true
  },
  fields: {
    type: [String]
  },
  timeCreated: {
    type: Date,
    default: Date.now
  }
});

export default models.templates || model('templates', templateSchema);
