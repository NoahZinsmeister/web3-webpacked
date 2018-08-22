'use strict';

var listeners = require('./web3Listeners');
var utilities = require('./web3Utilities');

module.exports = Object.assign({}, utilities, listeners);