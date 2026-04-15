const { merge } = require('webpack-merge');
const baseConfig = require('@openedx/frontend-build/config/webpack.dev.config');

module.exports = merge(baseConfig, {
  devServer: {
    allowedHosts: 'all',
  },
});
