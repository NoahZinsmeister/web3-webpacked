'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var ethUtil = require('ethereumjs-util');
var ethSigUtil = require('eth-sig-util');
var listeners = require('./web3Listeners');

var ERC20ABI = [{ "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "payable": false, "stateMutability": "view", "type": "function" }]; // eslint-disable-line

var networkDataById = {
  1: {
    name: 'Mainnet',
    type: 'PoW',
    etherscanPrefix: ''
  },
  3: {
    name: 'Ropsten',
    type: 'PoW',
    etherscanPrefix: 'ropsten.'
  },
  4: {
    name: 'Rinkeby',
    type: 'PoA',
    etherscanPrefix: 'rinkeby.'
  },
  42: {
    name: 'Kovan',
    type: 'PoA',
    etherscanPrefix: 'kovan.'
  }
};

var getEthereumVariables = {
  web3js: function web3js() {
    return listeners.getWeb3js();
  },
  account: function account() {
    return listeners.getAccount();
  },
  networkId: function networkId() {
    return listeners.getNetworkId();
  }
};

var _setEthereumVariableGetters = function _setEthereumVariableGetters(getters) {
  Object.keys(getters).forEach(function (getter) {
    getEthereumVariables[getter] = getters[getter];
  });
};

var sendTransaction = function sendTransaction(method, handlers) {
  var requiredHandlers = ['error'];
  var optionalHandlers = ['transactionHash', 'receipt', 'confirmation'];
  var allHandlers = requiredHandlers.concat(optionalHandlers);
  // ensure an error handler was passed
  if (!requiredHandlers.every(function (handler) {
    return Object.keys(handlers).includes(handler);
  })) {
    throw Error('Please provide an \'error\' handler.');
  }
  // ensure only allowed handlers can be passed
  if (!Object.keys(handlers).every(function (handler) {
    return allHandlers.includes(handler);
  })) {
    throw Error('Invalid handler passed. Allowed handlers are: \'' + allHandlers.toString().join('\', \'') + '\'.');
  }
  // for all handlers that weren't passed, set them as empty functions
  for (var i = 0; i < allHandlers.length; i++) {
    if (handlers[allHandlers[i]] === undefined) handlers[allHandlers[i]] = function () {};
  }

  // define promises for the variables we need to validate/send the transaction
  var gasPricePromise = function gasPricePromise() {
    return getEthereumVariables.web3js().eth.getGasPrice().catch(function (error) {
      handlers['error'](error, 'Could not fetch gas price.');
      return null;
    });
  };

  var gasPromise = function gasPromise() {
    return method.estimateGas({ from: getEthereumVariables.account() }).catch(function (error) {
      handlers['error'](error, 'The transaction would fail.');
      return null;
    });
  };

  var balanceWeiPromise = function balanceWeiPromise() {
    return getBalance(undefined, 'wei').catch(function (error) {
      handlers['error'](error, 'Could not fetch sending address balance.');
      return null;
    });
  };

  var handledErrorName = 'HandledError';

  return Promise.all([gasPricePromise(), gasPromise(), balanceWeiPromise()]).then(function (results) {
    // ensure that none of the promises failed
    if (results.some(function (result) {
      return result === null;
    })) {
      var error = Error('This error was already handled.');
      error.name = handledErrorName;
      throw error;
    }

    // extract variables

    var _results = _slicedToArray(results, 3),
        gasPrice = _results[0],
        gas = _results[1],
        balanceWei = _results[2];

    // ensure the sender has enough ether to pay gas


    var safeGas = parseInt(gas * 1.1);
    var requiredWei = new ethUtil.BN(gasPrice).mul(new ethUtil.BN(safeGas));
    if (new ethUtil.BN(balanceWei).lt(requiredWei)) {
      var requiredEth = toDecimal(requiredWei.toString(), '18');
      var errorMessage = 'Insufficient balance. Ensure you have at least ' + requiredEth + ' ETH.';
      handlers['error'](Error(errorMessage), errorMessage);
      return;
    }

    // send the transaction
    method.send({ from: getEthereumVariables.account(), gasPrice: gasPrice, gas: safeGas }).on('transactionHash', function (transactionHash) {
      handlers['transactionHash'](transactionHash);
    }).on('receipt', function (receipt) {
      handlers['receipt'](receipt);
    }).on('confirmation', function (confirmationNumber, receipt) {
      handlers['confirmation'](confirmationNumber, receipt);
    }).on('error', function (error) {
      handlers['error'](error, 'Unable to send transaction.');
    });
  }).catch(function (error) {
    if (error.name !== handledErrorName) {
      handlers['error'](error, 'Unexpected error.');
    }
  });
};

var signPersonal = function signPersonal(message) {
  var from = getEthereumVariables.account();
  if (!ethUtil.isValidChecksumAddress(from)) throw Error('Current account \'' + from + '\' has an invalid checksum.');

  var encodedMessage = ethUtil.bufferToHex(Buffer.from(message, 'utf8'));

  return new Promise(function (resolve, reject) {
    getEthereumVariables.web3js().currentProvider.sendAsync({
      method: 'personal_sign',
      params: [encodedMessage, from],
      from: from
    }, function (error, result) {
      if (error) return reject(error);
      if (result.error) return reject(result.error.message);

      var returnData = {};
      returnData.signature = result.result;

      var signature = ethUtil.fromRpcSig(returnData.signature);
      returnData.r = ethUtil.addHexPrefix(Buffer.from(signature.r).toString('hex'));
      returnData.s = ethUtil.addHexPrefix(Buffer.from(signature.s).toString('hex'));
      returnData.v = signature.v;

      // ensure that the signature matches
      var recovered = ethUtil.ecrecover(ethUtil.hashPersonalMessage(ethUtil.toBuffer(message)), signature.v, ethUtil.toBuffer(signature.r), ethUtil.toBuffer(signature.s));
      if (ethUtil.toChecksumAddress(ethUtil.pubToAddress(recovered).toString('hex')) !== from) {
        return reject(Error('The returned signature \'' + returnData.signature + '\' didn\'t originate from address \'' + from + '\'.'));
      }
      returnData.from = from;

      resolve(returnData);
    });
  });
};

var signTypedData = function signTypedData(typedData) {
  var from = getEthereumVariables.account();
  if (!ethUtil.isValidChecksumAddress(from)) throw Error('Current account \'' + from + '\' has an invalid checksum.');

  // we have to do it this way because web3 1.0 doesn't expose this functionality
  return new Promise(function (resolve, reject) {
    getEthereumVariables.web3js().currentProvider.sendAsync({
      method: 'eth_signTypedData',
      params: [typedData, from],
      from: from
    }, function (error, result) {
      if (error) return reject(error);
      if (result.error) return reject(result.error.message);

      var returnData = {};
      returnData.signature = result.result;

      // ensure that the signature matches
      var recovered = ethSigUtil.recoverTypedSignature({
        data: typedData,
        sig: returnData.signature
      });
      if (ethUtil.toChecksumAddress(recovered) !== from) {
        return reject(Error('Returned signature \'' + returnData.signature + '\' didn\'t originate from address \'' + from + '\'.'));
      }
      returnData.from = from;

      returnData.messageHash = ethSigUtil.typedSignatureHash(typedData);

      var signature = ethUtil.fromRpcSig(returnData.signature);
      returnData.r = ethUtil.addHexPrefix(Buffer.from(signature.r).toString('hex'));
      returnData.s = ethUtil.addHexPrefix(Buffer.from(signature.s).toString('hex'));
      returnData.v = signature.v;

      resolve(returnData);
    });
  });
};

var getBalance = function getBalance(account, format) {
  if (account === undefined) account = getEthereumVariables.account();
  if (format === undefined) format = 'ether';

  return getEthereumVariables.web3js().eth.getBalance(account).then(function (balance) {
    return getEthereumVariables.web3js().utils.fromWei(balance, format);
  });
};

var getERC20Balance = function getERC20Balance(ERC20Address, account) {
  if (account === undefined) account = getEthereumVariables.account();

  var ERC20 = getContract(ERC20ABI, ERC20Address);

  var decimalsPromise = function decimalsPromise() {
    return ERC20.methods.decimals().call();
  };
  var balancePromise = function balancePromise() {
    return ERC20.methods.balanceOf(account).call();
  };

  return Promise.all([balancePromise(), decimalsPromise()]).then(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        balance = _ref2[0],
        decimals = _ref2[1];

    return toDecimal(balance, decimals);
  });
};

var toDecimal = function toDecimal(number, decimals) {
  if (number.length < decimals) {
    number = '0'.repeat(decimals - number.length) + number;
  }
  var difference = number.length - decimals;

  var integer = difference === 0 ? '0' : number.slice(0, difference);
  var fraction = number.slice(difference).replace(/0+$/g, '');

  return integer + (fraction === '' ? '' : '.') + fraction;
};

var fromDecimal = function fromDecimal(number, decimals) {
  var _number$split = number.split('.'),
      _number$split2 = _slicedToArray(_number$split, 2),
      integer = _number$split2[0],
      fraction = _number$split2[1];

  fraction = fraction === undefined ? '' : fraction;
  if (fraction.length > decimals) throw new Error('The fractional amount of the passed number was too high');
  fraction = fraction + '0'.repeat(decimals - fraction.length);
  return integer + fraction;
};

var getNetworkName = function getNetworkName(networkId) {
  networkId = networkId === undefined ? String(getEthereumVariables.networkId()) : String(networkId);
  if (!Object.keys(networkDataById).includes(networkId)) throw Error('Network id \'' + networkId + '\' is invalid.');
  return networkDataById[networkId].name;
};

var getNetworkType = function getNetworkType(networkId) {
  networkId = networkId === undefined ? String(getEthereumVariables.networkId()) : String(networkId);
  if (!Object.keys(networkDataById).includes(networkId)) throw Error('Network id \'' + networkId + '\' is invalid.');
  return networkDataById[networkId].type;
};

var getContract = function getContract(ABI, address, options) {
  var web3js = getEthereumVariables.web3js();
  return new web3js.eth.Contract(ABI, address, options);
};

var etherscanFormat = function etherscanFormat(type, data, networkId) {
  if (!['transaction', 'address', 'token'].includes(type)) throw Error('Type \'' + type + '\' is invalid.');
  networkId = networkId === undefined ? String(getEthereumVariables.networkId()) : String(networkId);
  if (!Object.keys(networkDataById).includes(networkId)) throw Error('Network id \'' + networkId + '\' is invalid.');

  var prefix = networkDataById[networkId].etherscanPrefix;
  var path;
  if (type === 'transaction') {
    path = 'tx';
  } else if (type === 'address') {
    path = 'address';
  } else {
    path = 'token';
  }

  return 'https://' + prefix + 'etherscan.io/' + path + '/' + data;
};

module.exports = {
  _setEthereumVariableGetters: _setEthereumVariableGetters,
  signPersonal: signPersonal,
  signTypedData: signTypedData,
  getBalance: getBalance,
  getERC20Balance: getERC20Balance,
  getNetworkName: getNetworkName,
  getNetworkType: getNetworkType,
  getContract: getContract,
  sendTransaction: sendTransaction,
  toDecimal: toDecimal,
  fromDecimal: fromDecimal,
  etherscanFormat: etherscanFormat,
  libraries: {
    'eth-sig-util': ethSigUtil,
    'ethereumjs-util': ethUtil
  }
};