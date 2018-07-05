const ethUtil = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')

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

const hashTypedData = ethSigUtil.typedSignatureHash

const signTypedData = (typedData, from, verify) => {
  if (!ethUtil.isValidChecksumAddress(from)) throw new Error(`'${from}' is not a valid checksummed address.`)

  // we have to do it this way because web3 1.0 doesn't expose this functionality
  return new Promise((resolve, reject) => {
    window.web3Webpacked.getWeb3js().currentProvider.sendAsync({
      method: 'eth_signTypedData',
      params: [typedData, from],
      from: from
    }, (error, result) => {
      if (error) reject(error)
      if (result.error) reject(result.error.message)

      if (verify || verify === undefined) {
        var recovered = ethSigUtil.recoverTypedSignature({
          data: typedData,
          sig: result.result
        })
        if (ethUtil.toChecksumAddress(recovered) !== from) {
          reject(new Error(`The returned signature '${result.result}' didn't originate from address '${from}'.`))
        }
      }

      result.messageHash = hashTypedData(typedData)

      var signature = ethUtil.fromRpcSig(result.result)
      signature.r = ethUtil.addHexPrefix(Buffer.from(signature.r).toString('hex'))
      signature.s = ethUtil.addHexPrefix(Buffer.from(signature.s).toString('hex'))
      result.signature = signature

      resolve(result)
    })
  })
}

const getNetworkId = () => {
  return window.web3Webpacked.getWeb3js().eth.net.getId()
    .then(id => {
      return String(id)
    })
}

const getNetworkName = async () => {
  let networkId = await getNetworkId()
  return networkDataById[networkId].name
}

const getNetworkType = async (web3js) => {
  let networkId = await getNetworkId()
  return networkDataById[networkId].type
}

const etherscanFormat = (networkId, type, data) => {
  if (!networkDataById.hasOwnProperty(networkId)) throw new Error(`Network id '${networkId}' is invalid.`)
  if (!['transaction', 'address'].includes(networkId)) throw new Error(`Type '${type}' is invalid.`)

  const prefix = networkDataById[networkId].etherscanPrefix
  const path = type === 'transaction' ? 'tx' : 'address'

  return `https://${prefix}etherscan.io/${path}/${data}`
}

module.exports = {
  hashTypedData: hashTypedData,
  signTypedData: signTypedData,
  networkDataById: networkDataById,
  getNetworkId: getNetworkId,
  getNetworkName: getNetworkName,
  getNetworkType: getNetworkType,
  etherscanFormat: etherscanFormat,
  libraries: {
    'eth-sig-util': ethSigUtil,
    'ethereumjs-util': ethUtil
  }
}
