node-ethereum [![Build Status](https://travis-ci.org/ethereum/node-ethereum.svg)](https://travis-ci.org/ethereum/node-ethereum)
===============

a simple standalone or embeddable Ethereum client written for Node.js.

Install
===
`git clone https://github.com/wanderer/node-ethereum`  
`cd ./node-ethereum`  
`npm install .`

Run
===
`./bin/ethereum`

Embed
===
```javacsript
 App = require('../')
 app = new App();
 app.start(function(){
  console.log("Ethereum has started");
 });
```
