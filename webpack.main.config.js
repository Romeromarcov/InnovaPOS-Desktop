// webpack.main.config.js
// Configuración de Webpack para el proceso principal de Electron.

const path = require('path');

module.exports = {
  /**
   * Este es el punto de entrada principal para tu aplicación, es el primer archivo
   * que se ejecuta en el proceso principal.
   */
  entry: {
    main: './src/main.js',
    preload: './src/preload.js',
  },
  output: {
    // Esta función asegura que el punto de entrada 'main' se compile como 'index.js',
    // mientras que otros puntos de entrada (como 'preload') mantendrán su nombre original.
    filename: (pathData) => {
      return pathData.chunk.name === 'main' ? 'index.js' : '[name].js';
    },
    path: path.resolve(__dirname, '.webpack', 'main'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      },
      {
        test: /node_modules\/sqlite3\/lib\/binding\/.+\.node$/,
        loader: 'node-loader',
        options: {
          name: '[name].[ext]'
        }
      }
    ],
  },
  resolve: {
    extensions: ['.js', '.json', '.node'],
  },
  externals: {
    sqlite3: 'commonjs sqlite3',
    'node-fetch': 'commonjs node-fetch',
  }
};

