# web3-webpacked

A convenience package that webpacks NPM packages useful for various dApp-related activities.

# Usage
Include the webpacked bundle in your source code:
```
<script src="js/Web3Webpacked.js"></script>
```

Initialize it with a web3 instance (Note that this is subject to change. Right now it expects the web3 object injected by MetaMask.):
```
const web3Webpacked = window.Web3Webpacked(window.web3)
```

Use it!
