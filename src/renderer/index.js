// src/renderer/index.js
// Punto de entrada de tu aplicación React en el proceso de renderizado de Electron.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css'; // Importa tus estilos CSS

// Crea la raíz de React para renderizar tu aplicación.
// React 18+ usa createRoot para un mejor rendimiento y nuevas características.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
