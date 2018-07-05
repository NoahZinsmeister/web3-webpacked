# Web3: Webpacked

`web3Webpacked` is a drop-in web3 solution for single-page Ethereum dApps. It's a [webpacked](https://webpack.js.org/) library consisting of:

- A robust management framework for the global `web3` object injected into browsers by [MetaMask](https://metamask.io/), [Trust](https://trustwalletapp.com/), etc. It exposes an instantiated [web3.js](https://web3js.readthedocs.io/en/1.0/) instance, keeps variables such as the current network and default account up-to-date, and fires customizable handlers when key events occur.

- Generic utility functions that hash and sign typed data, format [Etherscan](https://etherscan.io/) links, etc. are exposed.

## Installation
Include the [minified bundle](./dist/web3Webpacked.min.js) (747 KiB) in your source code:

```html
<script src="js/web3Webpacked.min.js"></script>
```

Initialize the package:

```javascript
window.addEventListener('load', () => {
  console.log('Initializing web3 upon page load.')
  window.web3Webpacked.initializeWeb3(config)
})
```

If you don't need `web3` functionality immediately on page load, you can initialize the package later:

```javascript
if (document.readyState === 'complete') {
  console.log('Initializing web3 after page load.')
  window.web3Webpacked.initializeWeb3(config)
}
```

See [Config Options](#config-options) for more instructions on what to include in the optional `config` variable, or [Usage](#usage) to jump right in.

## Config Options
The following options can be set in the `config` variable passed to `initializeWeb3`.

### `handler`
- `Object` Up to four handlers triggered on various events.
  - `noWeb3Handler`: `noWeb3Handler()` Triggered when no injected global `web3` instance was found. This means that the user's browser does not have web3 support. Will also be triggered in the (unlikely) event that your code called `initializeWeb3` before `web3` injection occurred (in which case you should re-read the [Installation](#installation) instructions).
  - `web3ErrorHandler`: `web3ErrorHandler(error)` Triggered when there was an error communicating with the Ethereum blockchain.
  - `web3NetworkChangeHandler`: `web3NetworkChangeHandler(networkId, oldNetworkId)` Triggered on network changes.
  - `web3AccountChangeHandler`: `web3AccountChangeHandler(account, oldAccount)` Triggered on default account changes.

### `pollTime`
- `Number` The poll interval (in milliseconds) The current recommendation is to poll for [account](https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md) and [network](https://medium.com/metamask/breaking-change-no-longer-reloading-pages-on-network-change-4a3e1fd2f5e7) changes.

### `allowedNetworks`
- `Array` of `Numbers` Enforces that the injected `web3` instance is connected to a particular network. If the detected network id is not in the passed list, `web3ErrorHandler` will be triggered, and `web3` functionality will be removed.

### Default Values
The default `config` values are below. You are encouraged to customize these values!

```javascript
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
```

## Usage
- `window.web3Webpacked.initializeWeb3([config])`: Initialize web3 in your project. See above for more information.
- `window.web3Webpacked.getWeb3js()`: Returns a [web3js](https://web3js.readthedocs.io/en/1.0/) instance (web3@1.0.0-beta.34).
- `window.web3Webpacked.hashTypedData(typedData, from, verify)`: Returns hashed typed data per [this article](https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290).
- `window.web3Webpacked.signTypedData(typedData)`: Returns the hash and signature of typed data per [this article](https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290).
- `window.web3Webpacked.networkDataById`: Returns an object whose keys are network ids, with various useful network-specific values.
- `window.web3Webpacked.getNetworkId()`: Returns the current network id.
- `window.web3Webpacked.getNetworkName()`: Returns the current network name.
- `window.web3Webpacked.getNetworkType()`: Returns the current network type (PoS | PoA).
- `window.web3Webpacked.etherscanFormat(networkId, type, data)`: Returns an [Etherscan](https://etherscan.io/) link to a given `transaction` or `address`.
- `window.web3Webpacked.libraries.`
  - `eth-sig-util`: Exposes the [eth-sig-util](https://github.com/MetaMask/eth-sig-util) package.
  - `ethereumjs-util`: Exposes the [ethereumjs-util](https://github.com/ethereumjs/ethereumjs-util) package.


## Note
To ensure that your code is accessing the most up-to-date variables, be sure not to hard code values like the `web3js` instance, the default `account`, the current `networkId`, etc. Call functions like `window.Web3Webpacked().getWeb3js()` whenever you need a `web3js` instance, rather than storing the result once in a static variable. The exception to this rule is if you are displaying e.g. the current account to the user in an HTML element. In such cases, be sure to include logic in your handlers that update static elements appropriately.
