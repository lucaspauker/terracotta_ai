"use strict";

/*
 * Defined the Mongoose Schema and return a Model for a Photo
 */

/* jshint node: true */

var mongoose = require('mongoose');

// create a schema for Dataset
var userSchema = new mongoose.Schema({
  email: String,
  first_name: String,
  last_name: String,
  picture: String,
  datetime: {type: Date, default: Date.now},
});

var User = mongoose.model('User', userSchema);

// make this available to our photos in our Node applications
module.exports = User;
