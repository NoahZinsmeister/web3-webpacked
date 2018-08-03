const ethUtil = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')
const listeners = require('./web3Listeners')

const networkDataById = {
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
}

const signPersonal = (hashedMessage) => {
  var from = listeners.getAccount()
  if (!ethUtil.isValidChecksumAddress(from)) throw Error(`Current account '${from}' has an invalid checksum.`)

  return new Promise((resolve, reject) => {
    listeners.getWeb3js().currentProvider.sendAsync({
      method: 'personal_sign',
      params: [hashedMessage, from],
      from: from
    }, (error, result) => {
      if (error) reject(error)
      if (result.error) reject(result.error.message)

      let returnData = {}
      returnData.signature = result.result

      var signature = ethUtil.fromRpcSig(returnData.signature)
      returnData.r = ethUtil.addHexPrefix(Buffer.from(signature.r).toString('hex'))
      returnData.s = ethUtil.addHexPrefix(Buffer.from(signature.s).toString('hex'))
      returnData.v = signature.v

      // ensure that the signature matches
      var recovered = ethUtil.ecrecover(
        ethUtil.hashPersonalMessage(ethUtil.toBuffer(hashedMessage)),
        signature.v, ethUtil.toBuffer(signature.r), ethUtil.toBuffer(signature.s)
      )
      if (ethUtil.toChecksumAddress(ethUtil.pubToAddress(recovered).toString('hex')) !== from) {
        reject(Error(`The returned signature '${returnData.signature}' didn't originate from address '${from}'.`))
      }
      returnData.from = from

      resolve(returnData)
    })
  })
}

const signTypedData = (typedData) => {
  var from = listeners.getAccount()
  if (!ethUtil.isValidChecksumAddress(from)) throw Error(`Current account '${from}' has an invalid checksum.`)

  // we have to do it this way because web3 1.0 doesn't expose this functionality
  return new Promise((resolve, reject) => {
    listeners.getWeb3js().currentProvider.sendAsync({
      method: 'eth_signTypedData',
      params: [typedData, from],
      from: from
    }, (error, result) => {
      if (error) reject(error)
      if (result.error) reject(result.error.message)

      let returnData = {}
      returnData.signature = result.result

      // ensure that the signature matches
      var recovered = ethSigUtil.recoverTypedSignature({
        data: typedData,
        sig: returnData.signature
      })
      if (ethUtil.toChecksumAddress(recovered) !== from) {
        reject(Error(`The returned signature '${returnData.signature}' didn't originate from address '${from}'.`))
      }
      returnData.from = from

      returnData.messageHash = ethSigUtil.typedSignatureHash(typedData)

      var signature = ethUtil.fromRpcSig(returnData.signature)
      returnData.r = ethUtil.addHexPrefix(Buffer.from(signature.r).toString('hex'))
      returnData.s = ethUtil.addHexPrefix(Buffer.from(signature.s).toString('hex'))
      returnData.v = signature.v

      resolve(returnData)
    })
  })
}

const getNetworkName = (networkId) => {
  networkId = networkId === undefined ? String(listeners.getNetworkId()) : String(networkId)
  if (!Object.keys(networkDataById).includes(networkId)) throw Error(`Network id '${networkId}' is invalid.`)
  return networkDataById[networkId].name
}

const getNetworkType = (networkId) => {
  networkId = networkId === undefined ? String(listeners.getNetworkId()) : String(networkId)
  if (!Object.keys(networkDataById).includes(networkId)) throw Error(`Network id '${networkId}' is invalid.`)
  return networkDataById[networkId].type
}

const getContract = (ABI, address, options) => {
  let web3js = listeners.getWeb3js()
  return new web3js.eth.Contract(ABI, address, options)
}

const etherscanFormat = (type, data, networkId) => {
  if (!['transaction', 'address'].includes(type)) throw Error(`Type '${type}' is invalid.`)
  networkId = networkId === undefined ? String(listeners.getNetworkId()) : String(networkId)
  if (!Object.keys(networkDataById).includes(networkId)) throw Error(`Network id '${networkId}' is invalid.`)

  const prefix = networkDataById[networkId].etherscanPrefix
  const path = type === 'transaction' ? 'tx' : 'address'

  return `https://${prefix}etherscan.io/${path}/${data}`
}

module.exports = {
  signPersonal: signPersonal,
  signTypedData: signTypedData,
  getNetworkName: getNetworkName,
  getNetworkType: getNetworkType,
  getContract: getContract,
  etherscanFormat: etherscanFormat,
  libraries: {
    'eth-sig-util': ethSigUtil,
    'ethereumjs-util': ethUtil
  }
}
