const express = require('express')
const app = express()
const path = require('path')
const logger = require('./middleware/logger');
const download = require('./middleware/download');

app.use(download);
app.use(logger);

app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')));
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')));
app.use('/jquery',express.static(path.join(__dirname, 'node_modules/jquery')))
app.use('/jquery-csv',express.static(path.join(__dirname, 'node_modules/jquery-csv')));
app.use('/mapbox-gl',express.static(path.join(__dirname,'node_modules/mapbox-gl')));
app.use('/threebox-plugin',express.static(path.join(__dirname,'node_modules/threebox-plugin')));


const PORT = process.env.PORT || 5000
app.listen(PORT, function () { 
  console.log('Visit http://127.0.0.1:5000') 
  }
);