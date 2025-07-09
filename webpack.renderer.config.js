// webpack.renderer.config.js
// Configuración de Webpack para el proceso de renderizado (tu UI de React).

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/, // Procesar archivos JavaScript y React
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/, // Procesar archivos CSS
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      },
    ],
  },
  plugins: [],
  resolve: {
    extensions: ['.js', '.json'], // Extensiones a resolver
  },
};