const path = require('path')
const webpack = require('webpack')

module.exports = {
  mode: 'production',
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin()
  ],
  entry: [
    path.resolve(__dirname, 'src', 'main.js')
  ],
  output: {
    library: 'Web3Webpacked',
    path: path.resolve(__dirname),
    filename: 'Web3Webpacked.js'
  }
}
