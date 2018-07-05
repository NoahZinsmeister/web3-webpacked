const path = require('path')
const webpack = require('webpack')
const UnminifiedWebpackPlugin = require('unminified-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  mode: 'production',
  entry: [
    path.resolve(__dirname, 'src', 'main.js')
  ],
  output: {
    library: 'web3Webpacked',
    path: path.resolve(__dirname, 'dist'),
    filename: 'web3Webpacked.min.js'
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new UnminifiedWebpackPlugin(),
    new BundleAnalyzerPlugin()
  ]
}
