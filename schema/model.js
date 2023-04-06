"use strict";

/*
 * Defined the Mongoose Schema and return a Model for a Photo
 */

/* jshint node: true */

var mongoose = require('mongoose');

// create a schema for Dataset
var modelSchema = new mongoose.Schema({
  name: String,
  provider: String,
  model_type: String,
  prompt: String,
  train_cost: String,
  inference_cost: String,
  datetime: {type: Date, default: Date.now},
  user_id: mongoose.Schema.Types.ObjectId,
});

var Model = mongoose.model('Model', modelSchema);

// make this available to our photos in our Node applications
module.exports = Model;
