var express = require('express');
var app = express();

app.get('/hello_world', function(req, res){
  res.send('hello world');
});

app.listen(3000);