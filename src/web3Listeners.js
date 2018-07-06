const Web3 = require('web3') // web3@1.0.0-beta.34

const state = {}

const resetState = (web3Error) => {
  state.initializeCalled = false
  state.web3error = web3Error === undefined ? false : web3Error

  state.web3js = undefined
  state.account = undefined
  state.networkId = undefined

  if (state.pollId !== undefined) clearInterval(state.pollId)
  state.pollId = undefined
}

const config = {
  handlers: {
    noWeb3Handler: () => {
      console.error('No web3 instance detected.')
    },
    web3ErrorHandler: (error) => {
      if (error.message.includes('Network Disallowed:')) console.log('Unsupported network.')
      console.error(`web3 Error: ${error}`)
    },
    web3NetworkChangeHandler: (networkId, oldNetworkId) => {
      console.log(`Network switched from ${oldNetworkId} to ${networkId}.`)
    },
    web3AccountChangeHandler: (account, oldAccount) => {
      if (account === null) console.log('No account detected, a password unlock is likely required.')
      console.log(`Primary account switched from ${oldAccount} to ${account}.`)
    }
  },
  pollTime: 1000, // 1 second
  allowedNetworks: [1, 3, 4, 42] // mainnet, ropsten, rinkeby, kovan
}

var lastTimePolled = new Date(0)

const initializeWeb3 = (passedConfig) => {
  if (state.initializeCalled) throw Error('initializeWeb3 was already called.')
  resetState()
  state.initializeCalled = true

  // deal with passed config
  if (passedConfig === undefined) passedConfig = {}

  Object.keys(passedConfig).map(key => {
    if (!Object.keys(config).includes(key)) throw Error(`'config' keys must be one of: ${Object.keys(config)}.`)
  })
  if (passedConfig.handlers !== undefined) {
    Object.keys(passedConfig.handlers).map(handler => {
      if (!Object.keys(config.handlers).includes(handler)) {
        throw Error(`'config.handlers' keys must be one of: ${Object.keys(config.handlers)}.`)
      }
      config.handlers[handler] = passedConfig.handlers[handler]
    })
  }
  if (passedConfig.pollTime !== undefined) config.pollTime = passedConfig.pollTime
  if (passedConfig.allowedNetworks !== undefined) config.allowedNetworks = passedConfig.allowedNetworks

  // instantiate web3js
  if (window.web3 === undefined || window.web3.currentProvider === undefined) {
    config.handlers.noWeb3Handler()
  } else {
    state.web3js = new Web3(window.web3.currentProvider)
    web3Poll()
  }
}

const web3Poll = () => {
  // prevent polling overload
  let currentTime = new Date()
  if ((lastTimePolled + config.pollTime) > currentTime) return
  lastTimePolled = currentTime

  // TODO: investigate whether the wrapped web3js instance updates when window.web3 updates (i.e. changes networks)...
  // ...but the page is not refreshed per:
  // https://medium.com/metamask/breaking-change-no-longer-reloading-pages-on-network-change-4a3e1fd2f5e7
  let networkPromise = state.web3js.eth.net.getId()
    .then(id => {
      if (!config.allowedNetworks.includes(id)) {
        throw Error(`Network Disallowed: Current network id '${id}' is disallowed.`) // triggers web3ErrorHandler below
      } else {
        if (state.networkId !== id) {
          let oldNetworkId = state.networkId
          state.networkId = id
          config.handlers.web3NetworkChangeHandler(state.networkId, oldNetworkId)
        }
      }
    })

  // check for default account changes
  let accountPromise = state.web3js.eth.getAccounts()
    .then(accounts => {
      let account = (accounts[0] === undefined) ? null : accounts[0]
      if (state.account !== account) {
        let oldAccount = state.account
        state.account = account
        config.handlers.web3AccountChangeHandler(state.account, oldAccount)
      }
    })

  Promise.all([networkPromise, accountPromise])
    .then(() => {
      if (state.pollId === undefined) {
        state.pollId = setInterval(web3Poll, config.pollTime)
      }
    })
    .catch(error => {
      resetState(true)
      config.handlers.web3ErrorHandler(error)
    })
}

const ensureInitialized = () => {
  if (!state.initializeCalled) throw Error('Call initializeWeb3 before calling this method.')
  if (state.web3Error) throw Error('There was a web3 error. Check your browser, and call initializeWeb3 again.')
}

const getWeb3js = () => {
  ensureInitialized()
  return state.web3js
}

const getAccount = () => {
  ensureInitialized()
  return state.account
}

const getNetworkId = () => {
  ensureInitialized()
  return state.networkId
}

module.exports = {
  initializeWeb3: initializeWeb3,
  getWeb3js: getWeb3js,
  getAccount: getAccount,
  getNetworkId: getNetworkId
}
