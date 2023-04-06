/* jshint node: true */

/*
 * To start the webserver run the command:
 *    node webServer.js
 *
 */

const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');
const fs = require("fs");

var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

var async = require('async');
var express = require('express');
var cors = require('cors');
var app = express();

app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());
app.use(cors());

// Load the Mongoose schema for User, Photo, and SchemaInfo
var SchemaInfo = require('./schema/schemaInfo.js');
var Dataset = require('./schema/dataset.js');
var Model = require('./schema/model.js');

mongoose.connect('mongodb://127.0.0.1/sharpen', { useNewUrlParser: true, useUnifiedTopology: true });

// We have the express static module (http://expressjs.com/en/starter/static-files.html) do all
// the work for us.
app.use(express.static(__dirname));

app.get('/', function (request, response) {
  response.send('Simple web server of files from ' + __dirname);
});

app.get('/data/list', function (request, response) {
  Dataset
    .find({})
    .then(info => {
      if (info.length === 0) {
        response.status(200).send('No data found');
        return;
      }
      let datasets = JSON.parse(JSON.stringify(info));
      response.end(JSON.stringify(datasets));
    }).catch(err => {
      response.status(500).send(JSON.stringify(err));
      return;
    });
});

app.post('/data/add', function (request, response) {
  // Do something
  console.log(request.body);
  const name = request.body.name;
  const type = request.body.type;
  const filename = request.body.filename;
  const datetime = request.body.datetime;
  if (name === '') {
    response.status(400).send("Must specify a name.");
    return;
  }
  Dataset
    .findOne({name: name})
    .then(dataset => {
      if (dataset) {
        response.status(400).send("Dataset name already exists, pick a unique name.");
        return;
      }
      const d = new Dataset({
        name: name,
        type: type,
        filename: filename,
        datetime: datetime,
      });
      console.log(d);
      d.save();
      response.status(200).send(d);
    }).catch(err => {
      response.status(500).send(JSON.stringify(err));
      return;
    });
});

app.get('/model/list', function (request, response) {
  Model
    .find({})
    .then(info => {
      if (info.length === 0) {
        response.status(200).send('No data found');
        return;
      }
      let models = JSON.parse(JSON.stringify(info));
      response.end(JSON.stringify(models));
    }).catch(err => {
      response.status(500).send(JSON.stringify(err));
      return;
    });
});

app.post('/model/add', function (request, response) {
  // Do something
  console.log(request.body);
  const name = request.body.name;
  const provider = request.body.provider;
  const model_type = request.body.model_type;
  const prompt = request.body.prompt;
  const train_cost = '0.0007';  // TODO: actually find these
  const inference_cost = '0.0007';  // TODO: actually find these
  const datetime = request.body.datetime;
  if (name === '') {
    response.status(400).send("Must specify a name.");
    return;
  }
  Model
    .findOne({name: name})
    .then(dataset => {
      if (dataset) {
        response.status(400).send("Dataset name already exists, pick a unique name.");
        return;
      }
      const m = new Model({
        name: name,
        provider: provider,
        model_type: model_type,
        prompt: prompt,
        train_cost: train_cost,
        inference_cost: inference_cost,
        datetime: datetime,
      });
      console.log(m);
      m.save();
      response.status(200).send(m);
    }).catch(err => {
      response.status(500).send(JSON.stringify(err));
      return;
    });
});


var server = app.listen(3005, function () {
  var port = server.address().port;
  console.log('Listening at http://127.0.0.1:' + port + ' exporting the directory ' + __dirname);
});


