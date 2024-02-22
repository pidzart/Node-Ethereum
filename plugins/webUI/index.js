var express = require('express'),
  request = require('request'),
  async = require('async'),
  shimServer = require('./shimServer.js'),
  WebSocketServer = require('ws').Server,
  server;

var app = express(),
  wss = new WebSocketServer({
    server: app
  });

wss.broadcast = function (data) {
  for (var i in this.clients)
    this.clients[i].send(data);
};

app.use('/public', express.static(__dirname + '/public'));
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.render(__dirname + '/views/index.jade');
});

app.get('/proxy/*', function (req, res) {

  var url = req.url.slice(1),
    urlMatch = /^(https?|http?|file):\/\//;

  var match = url.match(urlMatch);
  if (!match) {
    url = 'http://' + url;
  }

  shimServer(url, 3000, function (port) {
    //load the page in a iframe
    res.render(__dirname + '/views/page', {
      'url': 'http://localhost:' + port
    });
  });

});

//requires the ws plugin to work
exports.requires = ['ws'];

exports.start = function(eth, done){
  server = app.listen(3000);
  done();
};

exports.stop = function(done){
  server.close(done);
};
