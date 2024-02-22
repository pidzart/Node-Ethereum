var WebSocketServer = require('ws').Server,
  wss;

//the function that starts the application
exports.start = function (options, done) {

  var self = this;

  wss = new WebSocketServer({
    port: 8084
  });

  wss.on('connection', function (ws) {
    ws.on('message', function (message) {
      console.log(message);

      var command = JSON.parse(message);

      if (command.method === 'toggleMining') {

        self.toggleMining();

        ws.send({
          'result': true,
          'id': command.id
        });
      }
      // app.rpc.runCall(message, function (result) {
      //   ws.send(result);
      // });
    });
  });

  wss.broadcast = function (data) {
    for (var i in this.clients)
      this.clients[i].send(data);
  };

  done();
};

exports.stop = function (done) {
  wss.close();
  done();
};

// -32700	Parse error	Invalid JSON was received by the server.
// An error occurred on the server while parsing the JSON text.
// -32600	Invalid Request	The JSON sent is not a valid Request object.
// -32601	Method not found	The method does not exist / is not available.
// -32602	Invalid params	Invalid method parameter(s).
// -32603	Internal error	Internal JSON-RPC error.
// -32000 to -32099	Server error	Reserved for implementation-defined server-errors.}
