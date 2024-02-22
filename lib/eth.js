var Eth = module.exports = function (app) {

  Object.defineProperties(this, {
    coinbase: {
      get: function () {
        return app.coinbase;
      }
    },

    isListening: {
      get: function () {
        return app.network.isListening;
      }
    },

    isMining: {
      value: false
    },

    gasPrice: {
      value: 0
    },

    key: {
      get: function () {
        return app.currentAccount.keys[0];
      }
    },

    keys: {
      get: function () {
        return app.currentAccount.keys;
      }
    },

    peerCount: {
      get: function () {
        return app.network.peers.length;
      }
    },

    defaultBlock: {
      value: -1
    }

  });

  //add async properties.. sorta
  for (var prop in this) {
    var cap = capitalize(prop);
    this['get' + cap] = function(cb){
      cb(this[prop]);
    };
  }

  function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
  }
};

//Returns the balance of the account of address given by the address
Eth.prototype.getBalanceAt = function (address) {

};

//Returns the value in storage at position given by the number _x of the account of address given by the address _a.
Eth.prototype.getStateAt = function (address, key, cb) {
  console.log("getting states ");
  cb(null ,"test");
};

//Returns the number of transactions send from the account of address given by _a.
Eth.prototype.getCountAt = function (address) {

};

//Returns true if the account of address given by _a is a contract-account.
Eth.prototype.getCodeAt = function (address) {

};

//Returns an anonymous object describing the block with hash _hash, passed as a string.
//or Returns an anonymous object describing the block with number _number, passed as an integer.
Eth.prototype.getBlock = function (hash) {

};

Eth.prototype.transact = function () {

};

Eth.prototype.call = function () {

};
