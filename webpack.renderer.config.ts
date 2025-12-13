import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

// CSS Modules (*.module.css)
rules.push({
  test: /\.module\.css$/,
  use: [
    { loader: 'style-loader' },
    { 
      loader: 'css-loader',
      options: {
        modules: true,
        importLoaders: 1,
      }
    },
    { loader: 'postcss-loader' }
  ],
});

// Regular CSS (*.css, but NOT *.module.css)
rules.push({
  test: /\.css$/,
  exclude: /\.module\.css$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader' },
    { loader: 'postcss-loader' }
  ],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};