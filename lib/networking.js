var Ethereum = require('ethereumjs-lib'),
  bignum = require('bignum'),
  log = require('npmlog'),
  processTx = require('./processTxs');

module.exports = function (done, results) {
  var self = this;

  //get the external ip
  var exip = this.settings.network.externalIp || results.ip,
    port = this.settings.network.port || 30303;

  this.network = new Ethereum.Network({
    id: results.id,
    ip: exip,
    port: port
  });

  this.network.on('connect', function () {
    log.info('connection');
  });

  this.network.on('message.hello', function (hello, peer) {
    peer.sendStatus(bignum(self.blockchain.td).toBuffer(), self.blockchain.head.hash(), new Buffer(self.blockchain.meta.genesis, 'hex'));
    log.info('networking', 'hello from: ' + hello.clientId + ' version:' + hello.protocolVersion);
  });

  this.network.on('message.status', function (status, peer) {
    peer.getTransactions(function(){
      //transaction!
    });
    self._sync.bind(self)(peer);
  });

  this.network.on('message.blocks', function (blocks, peer) {
    log.info('networking', peer.internalId + ' got ' + blocks.length + ' blocks');
  });

  this.network.on('message.disconnect', function (dis) {
    log.info('networking', 'dissconect: ' + dis.reason);
  });

  this.network.on('message.transactions', function (transactions, peer) {
    log.info('networking', peer.internalId + ' got transactions');

    //check to make sure we dont alread have the tx
    transactions.forEach(function (tx) {
      var hash = tx.hash().toString('hex');
      if (tx.validate()) {

        var pos = self.pendingTxs.map(function (t) {
          return t.hash().toString('hex');
        }).indexOf(hash);

        if (!pos) {
          //save the tx
          pos = self.pendingTxs.push(tx) - 1;
          processTx.bind(self)(tx, function (p, err) {
            //if it is an invalid tx remove it from the list
            if (err) {
              log.info('tx', 'invalid state: ' + hash);
              self.orderedTxs.splice(p, p + 1);
            }
          }.bind(this, pos));
        }
      } else {
        log.info('tx', 'invalid signature or stucture' + hash);
      }
    });

    //TODO: check if transaction is in the DB
    //check if the transaction is valid
    //push tx to txlist
    //save in db
  });

  this.network.on('message.peers', function (peers, peer) {
    log.info('networking', peer.internalId + ' got peers');
  });

  this.network.on('message.getPeers', function (peers, peer) {
    //sending peers is implemented in the logic
    log.info('networking', peer.internalId + ' got get peers');
  });

  this.network.on('message.getBlockHashes', function (message, peer) {
    log.info('networking', peer.internalId + ' got Get Block Hashes');
  });

  this.network.on('message.blockHashes', function (message, peer) {
    log.info('networking', peer.internalId + ' got Block Hashes');
  });

  this.network.on('message.getBlocks', function (message, peer) {
    this.blockchain.getBlocks(message, function(blocks){
      peer.sendBlocks(blocks);
    });
    log.info('networking', peer.internalId + 'got get Blocks');
  });

  this.network.on('message.getTransactions', function (message, peer) {
    log.info('networking', peer.internalId + ' got request for transactions');
    peer.sendTransactions(self.pendingTxs);
  });
  this.network.on('closing', function (peer) {
    log.info('networking', peer.internalId + ' closing');
  });

  this.network.on('socket.error', function (e) {
    log.error('networking', 'socket error: ' + e);
  });

  this.network.on('parsing.error', function (e) {
    log.error('networking', 'parse error: ' + e);
  });

  this.network.on('message.ping', function (blocks, peer) {
    log.info('networking', peer.internalId + ' got ping');
  });

  this.network.listen(this.settings.network.port, this.settings.network.host, done);
};
