var async = require('async');

var unprocessedTxs = [];

var q = async.queue(function (params, cb) {
  params.vm.runTx(params.tx, params.block, cb);
}, 1);

/**
 * Runs transaction as they come in
 */
module.exports = function (txs, cb) {

  var self =  this;

  if (!Array.isArray(txs)) {
    txs = [txs];
  }

  unprocessedTxs.concat(txs);

  if (!this.isSyncing && this.isMining) {
    unprocessedTxs.forEach(function(tx){
      q.push({
        tx: tx,
        block: self.currentBlock,
        vm: self.vm
      }, cb); 
    });
  }
};
