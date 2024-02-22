var App = require('../'),
  fs = require('fs'),
  async = require('async');

var app;

describe('basic app functions', function () {

  it('should start', function (done) {
    app = new App();
    app.start(done);
  });

  it('should stop', function (done) {
    app.stop(done);
  });

  it('should connect to another peer', function (done) {
    var count = 0,
      peers = [];

    async.whilst(

      function () {
        return count < 5;
      },

      function (callback) {
        var settings = {
          'network': {
            'port': 30316,
            'host': '0.0.0.0'
          },
          'upnp': false,
          'rpc': false
        };

        count++;

        settings.network.port += count;
        settings.path = './test/testClient' + count;

        try{
          fs.mkdirSync(settings.path);
        }catch(e){}

        var app = new App(settings);
        peers.push(app);
        app.start(callback);

      },

      function(){
        done();
      }
    );
  });
});
