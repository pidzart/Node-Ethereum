var $ = require('jquery-browserify');
var ws = new WebSocket('ws://localhost:8084');
var idCount = 0;

ws.onmessage = function (data) {
  console.log(data);
  // flags.binary will be set if a binary data is received
  // flags.masked will be set if the data was masked
};


$(window).on('load', function () {
  $('#mine').on('click', function () {
    var command = {
      'method': 'toggleMining',
      'id': idCount++
    };
    ws.send(JSON.stringify(command));
  });
});
