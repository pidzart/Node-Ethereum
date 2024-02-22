var express = require('express'),
  request = require('request'),
  through = require('through'),
  async = require('async'),
  url = require('url'),
  path = require('path'),
  fs = require('fs');

var injectScript = '<script type="text/javascript">' + fs.readFileSync(__dirname + '/injectScript.js') + '</script>';

module.exports = function (hostUrl, port, cb) {
  var parsedUrl = url.parse(hostUrl);

  var app = express(),
    inusePort = true;

  app.get('*', function (req, res) {
    //todo: check if url is anouther domain
    var rurl = req.url;
    if (rurl === '/') {
      rurl = hostUrl;
      //inject scripts here

      var first = true,
        inject = through(function write(data) {
          if (first) {
            var string = data.toString();
            var match = string.match(/<\s*html\s*>/);
            if (match) {
              string = string.slice(0, match.index + match[0].length) + injectScript + string.slice(match.index + match[0].length);
            }

            this.queue(new Buffer(string));
            first = false;
          } else {
            this.queue(data);
          }
        });

      if (parsedUrl.protocol !== 'file:') {
        request(rurl).pipe(inject).pipe(res);
      } else {
        fs.createReadStream(parsedUrl.path).pipe(inject).pipe(res);
      }
    } else {

      if (parsedUrl.protocol !== 'file:') {
        //load from net
        request(parsedUrl.resolve(rurl)).pipe(res);
      } else {
        //load from file system
        var dir = path.dirname(parsedUrl.path),
          stream = fs.createReadStream(dir + rurl);

        stream.on('error', function (error) {
          if (error.code === 'ENOENT') {
            res.status(404).end('404 not found');
          } else {
            throw error;
          }
        });

        stream.on('readable', function () {
          stream.pipe(res);
        });
      }
    }
  });

  async.whilst(
    function () {
      return inusePort;
    },
    function (done) {

      var server = app.listen(port);

      server.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
          port++;
          done();
        }
      });

      server.once('listening', function () {
        inusePort = false;
        done();
      });

    }, function () {
      cb(port);
    }
  );
};
