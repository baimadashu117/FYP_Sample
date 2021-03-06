const express = require('express')
const app = express()
const path = require('path')
const logger = require('./middleware/logger');
app.use(logger);

app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')));
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')));
app.use('/jquery',express.static(path.join(__dirname, 'node_modules/jquery')))
app.use('/jquery-csv',express.static(path.join(__dirname, 'node_modules/jquery-csv')));

app.listen(3000, function () { 
  console.log('Visit http://127.0.0.1:3000') 
  }
);