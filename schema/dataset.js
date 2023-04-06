"use strict";

/*
 * Defined the Mongoose Schema and return a Model for a Photo
 */

/* jshint node: true */

var mongoose = require('mongoose');

// create a schema for Dataset
var datasetSchema = new mongoose.Schema({
  name: String,
  type: String,
  filename: String, // 	Name of a file containing the actual photo (in the directory project6/images).
  datetime: {type: Date, default: Date.now}, // 	The date and time when the photo was added to the database
  user_id: mongoose.Schema.Types.ObjectId, // The ID of the user who created the photo.
});

// the schema is useless so far
// we need to create a model using it
var Dataset = mongoose.model('Dataset', datasetSchema);

// make this available to our photos in our Node applications
module.exports = Dataset;
