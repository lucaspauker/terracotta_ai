import { Schema, model, models } from 'mongoose';

const projectSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  timeCreated: {
    type: Date,
    default: Date.now
  }
});

export default models.projects || model('projects', projectSchema);
