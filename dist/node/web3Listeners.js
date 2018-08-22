'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var Web3 = require('web3'); // web3@1.0.0-beta.34

var state = {};

var resetState = function resetState(web3Error) {
  state.initializeCalled = false;
  state.initialized = false;
  state.web3error = web3Error === undefined ? false : web3Error;

  state.web3js = undefined;
  state.account = undefined;
  state.networkId = undefined;

  if (state.pollId !== undefined) clearInterval(state.pollId);
  state.pollId = undefined;
};

var networkErrorName = 'UnsupportedEthereumNetworkError';

var config = {
  handlers: {
    // Prompt the user to e.g. install MetaMask or download Trust
    noWeb3Handler: function noWeb3Handler() {
      console.error('No web3 instance detected.');
    },
    // Check blockchain-dependent data
    web3Ready: function web3Ready() {
      console.log('web3 initialized.');
    },
    // Notify the user of error, deal with unsupported networks
    web3ErrorHandler: function web3ErrorHandler(error) {
      if (error.name === networkErrorName) {
        console.error(error.message);
      } else {
        console.error('web3 Error: ' + error);
      }
    },
    // Notify the user that they have switched networks, potentially re-instatiate smart contracts
    web3NetworkChangeHandler: function web3NetworkChangeHandler(networkId, oldNetworkId) {
      console.log('Network switched from ' + oldNetworkId + ' to ' + networkId + '.');
    },
    // Notify the user that they have switched accounts, update balances
    web3AccountChangeHandler: function web3AccountChangeHandler(account, oldAccount) {
      if (account === null) {
        console.log('No account detected, a password unlock is likely required.');
      } else {
        console.log('Primary account switched from ' + oldAccount + ' to ' + account + '.');
      }
    }
  },
  pollTime: 1000, // 1 second
  supportedNetworks: [1, 3, 4, 42] // mainnet, ropsten, rinkeby, kovan
};

var lastTimePolled = new Date(0);

var initializeWeb3 = function initializeWeb3(passedConfig) {
  if (state.initializeCalled) throw Error('initializeWeb3 was already called.');
  resetState();
  state.initializeCalled = true;

  // deal with passed config
  if (passedConfig === undefined) passedConfig = {};

  Object.keys(passedConfig).map(function (key) {
    if (!Object.keys(config).includes(key)) throw Error('\'config\' keys must be one of: ' + Object.keys(config) + '.');
  });
  if (passedConfig.handlers !== undefined) {
    Object.keys(passedConfig.handlers).map(function (handler) {
      if (!Object.keys(config.handlers).includes(handler)) {
        throw Error('\'config.handlers\' keys must be one of: ' + Object.keys(config.handlers) + '.');
      }
      config.handlers[handler] = passedConfig.handlers[handler];
    });
  }
  if (passedConfig.pollTime !== undefined) config.pollTime = passedConfig.pollTime;
  if (passedConfig.supportedNetworks !== undefined) config.supportedNetworks = passedConfig.supportedNetworks;

  // instantiate web3js
  if (window.web3 === undefined || window.web3.currentProvider === undefined) {
    config.handlers.noWeb3Handler();
  } else {
    state.web3js = new Web3(window.web3.currentProvider);
    web3Poll(true);
  }
};

var web3Poll = function web3Poll(first) {
  // prevent polling overload
  var currentTime = new Date();
  if (lastTimePolled + config.pollTime > currentTime) return;
  lastTimePolled = currentTime;

  // TODO investigate whether the wrapped web3js instance updates when window.web3 updates (i.e. changes networks)...
  // ...but the page is not refreshed per:
  // https://medium.com/metamask/breaking-change-no-longer-reloading-pages-on-network-change-4a3e1fd2f5e7
  var networkPromise = function networkPromise() {
    return state.web3js.eth.net.getId().then(function (id) {
      if (!config.supportedNetworks.includes(id)) {
        var error = Error('Current network id \'' + id + '\' is unsupported.');
        error.name = networkErrorName;
        throw error; // triggers web3ErrorHandler below
      } else {
        return id;
      }
    });
  };

  // check for default account changes
  var accountPromise = function accountPromise() {
    return state.web3js.eth.getAccounts();
  };

  Promise.all([networkPromise(), accountPromise()]).then(function (values) {
    var _values = _slicedToArray(values, 2),
        id = _values[0],
        accounts = _values[1];

    // update network id


    var oldNetworkId = state.networkId;
    if (state.networkId !== id) {
      state.networkId = id;
    }

    // update account
    var account = accounts === undefined || accounts[0] === undefined ? null : accounts[0];
    var oldAccount = state.account;
    if (state.account !== account) {
      state.account = account;
    }

    // handle first-time initialization
    if (first) {
      state.initialized = true;
      config.handlers.web3Ready();
    }

    // call handlers
    if (oldNetworkId !== state.networkId) {
      config.handlers.web3NetworkChangeHandler(state.networkId, oldNetworkId);
    }
    if (oldAccount !== state.account) {
      config.handlers.web3AccountChangeHandler(state.account, oldAccount);
    }

    // poll if not already
    if (state.pollId === undefined) {
      state.pollId = setInterval(web3Poll, config.pollTime);
    }
  }).catch(function (error) {
    resetState(true);
    config.handlers.web3ErrorHandler(error);
  });
};

var ensureInitialized = function ensureInitialized() {
  if (state.web3Error) throw Error('There was a web3 error. Ensure that your browser is connected to Ethereum.');
  if (!state.initialized) throw Error('web3 is not initialized. Consider using the web3Ready handler');
};

var getWeb3js = function getWeb3js() {
  ensureInitialized();
  return state.web3js;
};

var getAccount = function getAccount() {
  ensureInitialized();
  return state.account;
};

var getNetworkId = function getNetworkId() {
  ensureInitialized();
  return state.networkId;
};

module.exports = {
  initializeWeb3: initializeWeb3,
  getWeb3js: getWeb3js,
  getAccount: getAccount,
  getNetworkId: getNetworkId,
  networkErrorName: networkErrorName
};