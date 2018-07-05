const listeners = require('./web3Listeners')
const utilities = require('./web3Utilities')

module.exports = {
  ...utilities,
  ...listeners
}
