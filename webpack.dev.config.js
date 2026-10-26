const { merge } = require('webpack-merge');
const baseConfig = require('@openedx/frontend-build/config/webpack.dev.config');

const config = merge(baseConfig, {
  devServer: {
    allowedHosts: 'all',
  },
});

// frontend-build excludes node_modules with a forward-slash regex. Webpack
// matches that regex against resolver paths, which use backslashes on Windows,
// so babel-loader transpiles node_modules. @tanstack/query-core's modern
// build uses class private methods that this Babel config does not support.
config.module.rules.forEach((rule) => {
  const loader = rule.use && rule.use.loader;
  if (loader === 'babel-loader' && rule.exclude instanceof RegExp) {
    rule.exclude = /node_modules[\\/](?!@(open)?edx)/;
  }
});

module.exports = config;
