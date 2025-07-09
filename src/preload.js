// preload.js
// Este script se ejecuta antes de que se cargue el script del renderer (tu React app).
// Tiene acceso a las APIs de Node.js y Electron, pero las expone de forma segura
// al proceso de renderizado a través de `contextBridge`.

const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is running and exposing electronAPI.');

// Expone un objeto 'electronAPI' en el objeto 'window' del proceso de renderizado.
// Esto permite que tu código React llame a funciones en el proceso principal.
contextBridge.exposeInMainWorld('electronAPI', {
  // Funciones para Autenticación JWT
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  refreshToken: (token) => ipcRenderer.invoke('refresh-token', token),
  authenticatedApiCall: (options) => ipcRenderer.invoke('authenticated-api-call', options),
  syncProductToServer: (options) => ipcRenderer.invoke('sync-product-to-server', options),

  // Funciones para Productos
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (product) => ipcRenderer.invoke('update-product', product), // Actualizar por ID local
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  updateProductRemoteId: (localId, remoteId) => ipcRenderer.invoke('update-product-remote-id', localId, remoteId),
  // === NUEVA FUNCIÓN IPC PARA ACTUALIZAR PRODUCTO LOCAL DESDE EL SERVIDOR ===
  updateProductFromServer: (product) => ipcRenderer.invoke('update-product-from-server', product),
  // =========================================================================

  // Funciones para Clientes
  getClients: () => ipcRenderer.invoke('get-clients'),
  addClient: (client) => ipcRenderer.invoke('add-client', client),

  // Funciones para Listas de Precio (ejemplo)
  getListasPrecio: () => ipcRenderer.invoke('get-listas-precio'),
  addListaPrecio: (lista) => ipcRenderer.invoke('add-lista-precio', lista),

  // Puedes añadir aquí más APIs para otras funcionalidades (ventas, préstamos, etc.)
  // Asegúrate de que cada función expuesta tenga un manejador correspondiente en main.js (ipcMain.handle)
});
