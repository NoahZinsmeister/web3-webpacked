![Example GIF](https://cdn-images-1.medium.com/max/1600/1*FYj3JzB51RWuYrr-T-RdnA.gif)

# Web3: Webpacked

This project is a drop-in solution for single-page Ethereum dApps. It's a [webpacked](https://webpack.js.org/) library consisting of:

- A robust management framework for the global `web3` object injected into browsers by [MetaMask](https://metamask.io/), [Trust](https://trustwalletapp.com/), etc. The framework exposes an instantiated [web3.js](https://web3js.readthedocs.io/en/1.0/) instance, keeps variables such as the current network and default account up-to-date, and fires customizable handlers when key events occur.

- Generic utility functions that sign typed data, format [Etherscan](https://etherscan.io/) links, expose npm packages, etc.

## Installation
Include the [minified bundle](./dist/web3Webpacked.min.js) (766 KiB) in your source code:

```html
<script src="js/web3Webpacked.min.js"></script>
```

This binds the library to the `window` object as `w3w`. To initialize the package:

```javascript
window.addEventListener('load', () => {
  console.log('Initializing web3 upon page load.')
  window.w3w.initializeWeb3(config)
})
```

If you don't need `web3` functionality immediately on page load, you can initialize the package later:

```javascript
if (document.readyState === 'complete') {
  console.log('Initializing web3 after page load.')
  window.w3w.initializeWeb3(config)
}
```

See [Config Options](#config-options) for more instructions on what to include in the optional `config` variable, or [Usage](#usage) to jump right in.

## Config Options
The following options can be set in the `config` variable passed to `initializeWeb3`.

### `handler`
- `Object` Up to four handlers triggered on various events.
  - `noWeb3Handler: function()` Triggered when no injected `window.web3` instance was found. This means that the user's browser does not have web3 support. Will also be triggered if your code calls `initializeWeb3` before web3 injection occurred (in which case you should re-read the [Installation](#installation) instructions).
  - `web3ErrorHandler: function([error])` Triggered when there was an error communicating with the Ethereum blockchain.
  - `web3NetworkChangeHandler: function([networkId, oldNetworkId])` Triggered on network changes.
  - `web3AccountChangeHandler: function([account, oldAccount])` Triggered on default account changes.

### `pollTime`
- `Number` The poll interval (in milliseconds). The current recommendation is to poll for [account](https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md) and [network](https://medium.com/metamask/breaking-change-no-longer-reloading-pages-on-network-change-4a3e1fd2f5e7) changes.

### `allowedNetworks`
- `Array` of `Number` Enforces that the injected `web3` instance is connected to a particular network. If the detected network id is not in the passed list, `web3ErrorHandler` will be triggered, and `web3` functionality will be removed.

### Default Values
The default `config` values are below. You are encouraged to customize these!

```javascript
const config = {
  handlers: {
    noWeb3Handler: () => {
      console.error('No web3 instance detected.')
    },
    web3ErrorHandler: (error) => {
      if (error.message.includes('Network Disallowed:')) console.error('Unsupported network.')
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
- `window.w3w.initializeWeb3([config])`: Initialize web3 in your project. See above for more details.
- `window.w3w.getWeb3js()`: Returns a [web3js](https://web3js.readthedocs.io/en/1.0/) instance (web3@1.0.0-beta.34).
- `window.w3w.getAccount()`: Returns the current default account.
- `window.w3w.getNetworkId()`: Returns the current network id as a `Number`.
- `window.w3w.getNetworkName([networkId])`: Returns the name of a network (defaults to the current network).
- `window.w3w.getNetworkType([networkId])`: Returns the type of a network (defaults to the current network).
- `window.w3w.signTypedData(typedData)`: Signs typed data with the current default account per [this article](https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290). Returns the signing address, message hash, and signature. The validity of the returned signature is guaranteed.
- `window.w3w.etherscanFormat(type, data[, networkId])`: Returns an [Etherscan](https://etherscan.io/) link to a given `transaction` or `address`.
- `window.w3w.libraries.`
  - `eth-sig-util`: Exposes the [eth-sig-util](https://github.com/MetaMask/eth-sig-util) package.
  - `ethereumjs-util`: Exposes the [ethereumjs-util](https://github.com/ethereumjs/ethereumjs-util) package.


## Note
To ensure that your code is accessing the most up-to-date variables, be sure not to hard code values like the `web3js` instance, the default `account`, the current `networkId`, etc. Instead, call functions like `window.w3w.getWeb3js()` whenever you need a `web3js` instance. The exception to this rule is if you are displaying e.g. the current account to the user in an HTML element. In such cases, be sure to include logic in your handlers that update static elements appropriately.
