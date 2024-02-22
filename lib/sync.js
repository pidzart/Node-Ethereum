var async = require('async'),
  bignum = require('bignum'),
  log = require('npmlog'),
  processBlocks = require('./processBlocks'),
  processTxs = require('./processTxs.js');

var hashes = {},
  orderedHashes = [],
  largestTD = bignum(0),
  stopSyncing;

var sync = module.exports = function (peer) {

  var td = bignum.fromBuffer(peer.td);

  //get largest td that we have found
  if (largestTD.lt(this.blockchain.td)) {
    largestTD = bignum(this.blockchain.td);
  }

  if (largestTD.lt(td)) {
    var startHash;

    if (stopSyncing) {
      stopSyncing();
    }

    this.isSyncing = true;

    //add besthash to the hash list
    var bestHash = peer.bestHash.toString('hex');
    orderedHashes.push(bestHash);
    hashes[bestHash] = {
      syncing: false
    };

    stopSyncing = syncHashes.bind(this)(peer, peer.bestHash, function () {});
  } else if (this.isSyncing) {
    //join the blockchain downloading effort
    syncBlocks(peer, false);
  }
};

/**
 * Syncs blockchain with a peer
 * @method sync
 * @param {Object} peer
 * @param {String} startHash - the block hash to start the sync from
 * @param {Function} cb - the callback
 */
function syncHashes(peer, startHash, cb) {
  var more = true,
    count = 32, //how many blocks to get per requst.
    self = this;

  async.whilst(function () {
    return more;
  }, function (cb2) {

    peer.getBlockHashes(startHash, count, function (hs) {

      hs.reverse();
      startHash = hs[0];

      self.blockchain.selectNeededHashes(hs, function (err, i) {
        hs = hs.slice(i);

        hs = hs.map(function (hash) {
          return hash.toString('hex');
        });

        orderedHashes = hs.concat(orderedHashes);

        hs.forEach(function (hash) {
          hashes[hash] = {
            syncing: false
          };
        });

        if (hs.length !== count) {
          more = false;
        }

        cb2();
      });

    });
  }, function () {

    var peers = self.network.peers;

    //get blocks from all connected peers

    async.each(peers, function (p, cb2) {
      syncBlocks.bind(self)(p, p.NODE_ID === peer.NODE_ID, cb2);
    }, function () {
      self.isSyncing = false;
      if (cb) cb();
    });

  });

  return function () {
    more = false;
  };
}

function syncBlocks(peer, source, cb) {

  if (!cb) {
    cb = function () {};
  }

  //block to fetch per request
  var num = 32,
    done = false,
    self = this;

  if (peer.isSyncing) {
    return;
  }

  peer.isSyncing = true;

  async.whilst(function () {
    return !done;
  }, function (cb2) {

    var hashesToGet = [],
      i = 0;

    //get hashes of blocks we need
    while (hashesToGet.length !== num && orderedHashes[i]) {
      //if not syncing
      if (!hashes[orderedHashes[i]].syncing) {
        //mark syncing true
        hashes[orderedHashes[i]].syncing = true;
        hashesToGet.push(orderedHashes[i]);
      }
      i++;
    }

    hashesToGet = hashesToGet.map(function (hs) {
      return new Buffer(hs, 'hex');
    });

    peer.getBlocks(hashesToGet, function (blocks) {

      blocks.forEach(function (block) {
        var blockHash = block.hash().toString('hex');

        //removes the fecthed hashes
        hashesToGet = hashesToGet.filter(function (el) {
          return el.toString('hex') !== blockHash;
        });

        hashes[blockHash].block = block;
      });


      //mark the hashes not fetched as fetchable
      hashesToGet.forEach(function (hash) {
        hashes[hash.toString('hex')].syncing = false;
      });


      var blocksToProcess = [];
      //remove the blocks that we will process
      while (orderedHashes[0] && hashes[orderedHashes[0]].block) {
        blocksToProcess.push(hashes[orderedHashes[0]].block);
        delete hashes[orderedHashes[0]];
        orderedHashes.shift();
      }

      //check to see if we are done syncing
      if (orderedHashes.length === 0) {
        peer.isSyncing = false;
        done = true;
      }

      processBlocks.bind(self)(blocksToProcess, function (err) {
        if (err && source) {
          peer.sendDisconnect();
          done = true;
          restartSync.bind(self)();
        }
      });

      cb2();

    });
  }, cb);
}

function restartSync() {

  log.info('sync', 'restarting syncing');
  hashes = {};
  orderedHashes = [];
  largestTD = bignum(0);
  var peers = this.network.peers;
  this.isSyncing = false;
  peers.sort(function (a, b) {
    return a.td < b.td;
  });

  if(peers.length) sync(peers[0]);
}
