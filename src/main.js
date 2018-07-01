const web3Webpacked = (web3) => {
  const ethUtil = require('ethereumjs-util')
  const ethSigUtil = require('eth-sig-util')

  const returnValues = {}

  returnValues.hashTypedData = ethSigUtil.typedSignatureHash

  returnValues.signTypedData = (messageParameters, from, verify) => {
    if (!ethUtil.isValidChecksumAddress(from)) throw new Error(`'${from}' is not a valid checksummed address.`)
    var messageHash = returnValues.hashTypedData(messageParameters)

    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        method: 'eth_signTypedData',
        params: [messageParameters, from],
        from: from
      }, (error, result) => {
        if (error) reject(error)
        if (result.error) reject(result.error.message)

        if (verify || verify === undefined) {
          var recovered = ethSigUtil.recoverTypedSignature({
            data: messageParameters,
            sig: result.result
          })
          if (ethUtil.toChecksumAddress(recovered) !== from) {
            reject(new Error(`The returned signature '${result.result}' didn't originate from address '${from}'.`))
          }
        }

        result.messageHash = messageHash
        var signature = ethUtil.fromRpcSig(result.result)
        signature.r = ethUtil.addHexPrefix(Buffer.from(signature.r).toString('hex'))
        signature.s = ethUtil.addHexPrefix(Buffer.from(signature.s).toString('hex'))
        result.signature = signature

        resolve(result)
      })
    })
  }

  return returnValues
}

module.exports = web3Webpacked
