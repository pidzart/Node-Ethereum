var crypto = require('crypto');

/**
 * @constructor
 */
var AccountMan = module.exports = function (db) {
  this.db = db;
};


/**
 * initializes the accounts by loading an array of all the know accounts
 */
AccountMan.prototype.init = function (cb) {

  var self = this;

  this.db.get('accounts', function (err, accounts) {

    if (err) throw err;

    self.accounts = accounts ? accounts : [];
    cb();
  });
};

AccountMan.prototype.unlock = function (name, password, cb) {
  this.db.get(name, function (err, epk) {

    if (err) throw err;

    var cipher = crypto.createDecipher('camellia256', password);

    cipher.update(epk);
    cb(cipher.final());
  });
};


AccountMan.prototype.create = function (name, password, cb) {

  var self = this,
    pk;

  function genKey(cb) {
    crypto.randomBytes(256, function (ex, buf) {
      pk = buf;
      cb(ex);
    });
  }

  function saveAccounts(cb) {
    self.accounts.push(name);
    self.accounts.sort();
    self.db.put('accounts', self.accounts, cb);
  }

  function savePk(cb) {
    var cipher = crypto.createCipher('camellia256', password);
    self.db.put(name, cipher.final(), cb);
  }

  async.series([
    genKey,
    saveAccounts,
    savePk
  ], function (err) {
    cb(err, pk);
  });
};

