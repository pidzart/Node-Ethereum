var jayson = require('jayson');

var tcp;

exports.start = function (app, cb) {
  if (app.settings.rpc) {
    var server = jayson.server(app.api);

    tcp = server.tcp().listen(app.settings.rpc.port, app.settings.rpc.host, function () {
      app.log.info('rpc', 'server started on port: ' + app.settings.rpc.port);
      cb();
    });
  }else{
    cb();
  }
};

//wrap 4 async
exports.stop = function (cb) {
  tcp.close(cb);
};
