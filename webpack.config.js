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
    path: path.resolve(__dirname, 'dist'),
    library: 'w3w',
    libraryTarget: 'umd',
    filename: 'web3Webpacked.min.js'
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new UnminifiedWebpackPlugin(),
    new BundleAnalyzerPlugin({ openAnalyzer: false })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          query: {
            presets: [
              'babel-preset-env'
            ].map(require.resolve),
            plugins: [
              require('babel-plugin-transform-object-rest-spread'),
              require('babel-plugin-transform-runtime')
            ]
          }
        }
      }
    ]
  }
}
