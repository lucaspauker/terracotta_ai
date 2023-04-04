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
});


var server = app.listen(3005, function () {
  var port = server.address().port;
  console.log('Listening at http://127.0.0.1:' + port + ' exporting the directory ' + __dirname);
});


