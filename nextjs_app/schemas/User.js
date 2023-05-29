import { Schema, model, models } from 'mongoose';

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  picture: {
    type: String
  },
  cohereKey: {
    type: String
  },
  openAiKey: {
    type: String
  },
  timeCreated: {
    type: Date,
    default: Date.now
  }
});

export default models.users || model('users', userSchema);