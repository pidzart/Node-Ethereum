var Ethereum = require('ethereumjs-lib'),
  fs = require('fs'),
  crypto = require('crypto'),
  levelup = require('levelup'),
  path = require('path'),
  log = require('npmlog'),
  async = require('async'),
  defaults = require('../defaults.json'),
  upnp = require('./upnp.js'),
  mining = require('./mine.js'),
  EthAPI = require('./eth.js');

/**
 * @constructor
 */
var App = module.exports = function (settings) {

  this.settings = settings ? settings : {};
  this.plugins = {};
  this.log = log;

  //a queue of transaction that have yet to be inculded in the blockchain
  this.pendingTxs = [];
  this.isSyncing = false;

  //set the default path for the config and database files
  defaults.path = process.env['HOME'] + '/.ethereum-node';

  //add the defaults
  for (var prop in defaults) {
    if (this. settings[prop] === void 0) this.settings[prop] = defaults[prop];
  }

  //create API
  this.api = new EthAPI(this);
};

//attach sync function
App.prototype._sync = require('./sync.js');

//attach mining functions
App.prototype.startMining = mining.start;
App.prototype.stopMining = mining.stop;
App.prototype.toggleMining = mining.toggle;

/**
 * Starts the client
 * @method start
 * @param {Function} cb a callback
 */
App.prototype.start = function (cb) {

  var self = this;

  /**
   * Checks the for the db folder and creates a new folder if it doesn't exist
   * @method checkPath
   * @param {Function} done
   * @private
   */
  function checkPath(done) {
    fs.exists(self.settings.path, function (exists) {
      if (exists) {
        done();
      } else {
        fs.mkdir(self.settings.path, done);
      }
    });
  }

  function setup(done) {
    //open DBs
    var path = self.settings.path,
      stateDB = levelup(path + '/state'),
      blockDB = levelup(path + '/block'),
      detailsDB = self.detailsDB = levelup(path + '/details');

    //create the blockchain
    self.blockchain = new Ethereum.Blockchain(blockDB, detailsDB);
    //create a VM
    self.vm = new Ethereum.VM(stateDB);

    //start the blockchain. This will lookup last block on the blockchain.
    self.blockchain.init(done);
  }

  //generates the genesis hash if needed
  function genesis(done) {
    var head = self.blockchain.head;

    if (!head) {
      //generate new genesis block
      self.vm.generateGenesis(function () {
        var block = new Ethereum.Block();
        block.header.stateRoot = self.vm.trie.root;
        log.info('state', 'genesis hash:' + block.hash().toString('hex'));
        self.blockchain.addBlock(block, done);
      });
    } else {
      log.info('state', 'starting with state root of: ' + head.header.stateRoot.toString('hex') +
        ' height:' + head.header.number.toString('hex'));

      done();
    }
  }

  //get the unquie id of the client. If there isn't one then generate one
  function getId(done) {
    self.detailsDB.get('id', function (err, id) {
      if (!id) {
        var hash = crypto.createHash('sha512');
        hash.update((Math.random())
          .toString());

        id = hash.digest('hex');

        self.detailsDB.put('id', id, function (err) {
          done(err, id);
        });

      } else {
        done(err, id);
      }
    });
  }

  //a no-op
  function noop(done) {
    done();
  }

  var tasks = {
    checkPath: checkPath,
    setup: ['checkPath', setup],
    genesis: ['setup', genesis],
    plugins: ['genesis', async.apply(self.loadPlugins.bind(self), self.settings.plugins)],
    ip: noop,
    upnp: noop,
    id: ['setup', getId],
    network: ['ip', 'upnp', 'id', require('./networking.js').bind(self)]
  };

  if (this.settings.upnp) {
    tasks.ip = upnp.extrenalIp;
    tasks.upnp = async.apply(upnp.map, self.settings.network.port);
  }

  //run everything
  async.auto(tasks, cb);
};

/**
 * Stops everything every
 * @method stop
 * @param {Function} cb calls this callback when everything is done
 */
App.prototype.stop = function (cb) {

  var self = this;

  function stopPlugins(cb) {

    var pluginArray = [];
    for (var o in self.plugins) {
      pluginArray.push(self.plugins[o]);
    }

    async.each(pluginArray, function (p, done) {
      if (p.stop) {
        p.stop(done);
      } else {
        done();
      }
    }, cb);
  }

  async.parallel([
    upnp.unmap,
    self.network.stop.bind(self.network),
    stopPlugins
  ], cb);

};


/**
 * Gets and serializes the entire block chain
 * @method getBlockChain
 * @param {Function} cb the callback is give an `Array` if blocks repsenting the
 * blockchain
 */
App.prototype.getBlockChain = function (cb) {

  var hash = this.blockchain.meta.genesis,
    height = this.blockchain.meta.height,
    self = this;

  this.blockchain.getBlockChain([hash], height, function (err, results) {
    //add the genesis block to the end of the results
    self.blockchain.getBlock(hash, function (err, genesis) {
      results.push(genesis);

      results = results.map(function (b) {
        return b.serialize(false);
      });

      cb(results);
    });
  });
};

App.prototype.loadPlugins = function (plugins, cb) {

  var self = this,
    autoObj = {};

  if (plugins) {

    plugins = Array.isArray(plugins) ? plugins : [plugins];
    plugins.forEach(function (p) {

      p = p.path ? p : {
        path: p
      };

      p.name = path.basename(p.path, '.js');

      try {
        var plugin = require(p.path);
        self.plugins[p.name] = plugin;

        var deps = [];
        if (plugin.dependencies) {
          deps = plugin.dependencies;
        }

        deps.push(plugin.start.bind(self, p));
        autoObj[p.name] = deps;
      } catch (e) {
        log.warn('plugins', 'unable to load plugin: ' + p.name);
      }
    });

    async.auto(autoObj, cb);
  } else {
    cb();
  }
};
