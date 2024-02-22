var Ethereum = require('ethereumjs-lib');
var crypto = require('crypto');

var utils = Ethereum.utils;

exports.toggle = exports.start = function () {

  console.log('starting mining!');

  var head = this.blockchain.head;
  //the current block
  var currentBlock = new Ethereum.Block();

  currentBlock.header.difficulty = utils.intToBuffer(currentBlock.header.canonicalDifficulty(head));
  currentBlock.header.gasLimit = utils.intToBuffer(currentBlock.header.canonicalGaslimit(head));

  var notFound = true;
  var start = process.hrtime();
  var hashes = 0;

  while (notFound) {
    currentBlock.header.nonce = crypto.pseudoRandomBytes(32);
    hashes++;
    if (currentBlock.header.validatePOW()) {
      console.log('nonce found!');
      notFound = false;
    }
  }

  var precision = 3; // 3 decimal places
  var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
  var sec = process.hrtime(start)[0];

  this.network.broadcastBlocks([currentBlock]);

  console.log(sec + ' s, ' + elapsed.toFixed(precision) + ' ms - '); // print message + time
  console.log('hash/s: ' + (hashes / sec));
};

exports.stop = function () {};
