var express = require('express');
var path = require('path');
var router = express.Router();

let download = router.get('/download', function (req, res, next) {
    console.log(__dirname);
    res.download("./public/resources/xyz_data.csv");
});

module.exports = download;