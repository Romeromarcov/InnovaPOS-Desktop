// src/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

// Ruta a la base de datos SQLite.
const dbPath = path.join(app.getPath('userData'), 'innovapos_local.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite en:', dbPath);
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS productos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          sku TEXT UNIQUE,
          costo_unitario REAL,
          activo INTEGER DEFAULT 1,
          fecha_creacion TEXT,
          fecha_actualizacion TEXT,
          remote_id INTEGER UNIQUE
        )
      `, (err) => {
        if (err) console.error('Error al crear tabla productos:', err.message);
        else console.log('Tabla productos verificada/creada.');
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          apellido TEXT NOT NULL,
          telefono TEXT,
          email TEXT UNIQUE,
          activo INTEGER DEFAULT 1,
          fecha_creacion TEXT,
          fecha_actualizacion TEXT
        )
      `, (err) => {
        if (err) console.error('Error al crear tabla clientes:', err.message);
        else console.log('Tabla clientes verificada/creada.');
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS listas_precio (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre_lista TEXT NOT NULL,
          descripcion TEXT,
          activo INTEGER DEFAULT 1,
          tiene_comision INTEGER DEFAULT 0,
          porcentaje_comision REAL,
          fecha_creacion TEXT,
          fecha_actualizacion TEXT
        )
      `, (err) => {
        if (err) console.error('Error al crear tabla listas_precio:', err.message);
        else console.log('Tabla listas_precio verificada/creada.');
      });
    });
  }
});

// Función para crear la ventana principal de Electron
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Carga la entrada de Webpack (Electron Forge inyecta esta variable)
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Cuando Electron está listo para crear ventanas.
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Manejadores de Procesos IPC (Inter-Process Communication) ---

ipcMain.handle('login', async (event, credentials) => {
  try {
    console.log('IPC: Recibida solicitud de login para usuario:', credentials.username);
    const response = await fetch('http://localhost:8000/api/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('IPC Login Error:', errorData);
      throw new Error(errorData.detail || 'Credenciales inválidas');
    }
    const data = await response.json();
    console.log('IPC Login Exitoso. Tokens recibidos.');
    return data;
  } catch (error) {
    console.error('Error en el proceso principal al iniciar sesión:', error.message);
    throw new Error(`Error de conexión o credenciales: ${error.message}`);
  }
});

ipcMain.handle('refresh-token', async (event, refreshToken) => {
  try {
    console.log('IPC: Recibida solicitud de refresh token.');
    const response = await fetch('http://localhost:8000/api/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('IPC Refresh Token Error:', errorData);
      throw new Error(errorData.detail || 'No se pudo refrescar el token');
    }
    const data = await response.json();
    console.log('IPC Refresh Token Exitoso. Nuevo access token recibido.');
    return data.access;
  } catch (error) {
    console.error('Error en el proceso principal al refrescar token:', error.message);
    throw new Error(`Error al refrescar token: ${error.message}`);
  }
});

ipcMain.handle('authenticatedApiCall', async (event, { url, method, body, accessToken }) => {
  try {
    console.log(`IPC: Realizando llamada a la API: ${method} ${url}`);
    const response = await fetch(`http://localhost:8000/api${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('IPC API Call Error:', errorData);
      throw new Error(errorData.detail || `Error en la llamada a la API: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('IPC API Call Exitoso. Datos recibidos.');
    return data;
  } catch (error) {
    console.error('Error en el proceso principal al realizar llamada a la API:', error.message);
    throw new Error(`Error de conexión o API: ${error.message}`);
  }
});

// --- Manejadores IPC para Productos (SQLite) ---
ipcMain.handle('get-products', async (event) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM productos', [], (err, rows) => {
      if (err) {
        console.error('SQLite Error (get-products):', err.message);
        reject(err.message);
      } else {
        console.log('SQLite (get-products): Productos obtenidos:', JSON.stringify(rows, null, 2));
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('add-product', async (event, product) => {
  return new Promise((resolve, reject) => {
    const { nombre, descripcion, sku, costo_unitario, activo = 1, remote_id = null } = product;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO productos (nombre, descripcion, sku, costo_unitario, activo, fecha_creacion, fecha_actualizacion, remote_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, sku, costo_unitario, activo ? 1 : 0, now, now, remote_id],
      function (err) {
        if (err) {
          console.error('SQLite Error (add-product):', err.message);
          reject(err.message);
        } else {
          db.get('SELECT * FROM productos WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
              console.error('SQLite Error (add-product - get after insert):', err.message);
              reject(err.message);
            } else {
              console.log('SQLite (add-product): Producto añadido y recuperado:', JSON.stringify(row, null, 2));
              resolve(row);
            }
          });
        }
      }
    );
  });
});

ipcMain.handle('update-product-from-server', async (event, product) => {
  return new Promise((resolve, reject) => {
    const { id, nombre, descripcion, sku, costo_unitario, activo, fecha_creacion, fecha_actualizacion } = product;
    const now = new Date().toISOString();

    console.log('SQLite (update-product-from-server): Intentando actualizar producto con remote_id:', id, 'a nombre:', nombre);

    db.run(
      `UPDATE productos SET nombre = ?, descripcion = ?, sku = ?, costo_unitario = ?, activo = ?, fecha_actualizacion = ? WHERE remote_id = ?`,
      [nombre, descripcion, sku, costo_unitario, activo ? 1 : 0, fecha_actualizacion || now, id],
      function (err) {
        if (err) {
          console.error('SQLite Error (update-product-from-server):', err.message);
          reject(err.message);
        } else {
          console.log(`SQLite (update-product-from-server): Producto con remote_id ${id} actualizado. Filas afectadas: ${this.changes}`);
          if (this.changes > 0) {
            db.get('SELECT * FROM productos WHERE remote_id = ?', [id], (err, row) => {
              if (err) {
                console.error('SQLite Error (update-product-from-server - get after update):', err.message);
                reject(err.message);
              } else {
                console.log('SQLite (update-product-from-server): Producto actualizado recuperado:', JSON.stringify(row, null, 2));
                resolve(row);
              }
            });
          } else {
            console.warn(`SQLite (update-product-from-server): No se encontró producto con remote_id ${id} para actualizar.`);
            resolve(null);
          }
        }
      }
    );
  });
});

ipcMain.handle('update-product-remote-id', async (event, localId, remoteId) => {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    console.log(`SQLite (update-product-remote-id): Actualizando remote_id para localId ${localId} a ${remoteId}`);
    db.run(
      `UPDATE productos SET remote_id = ?, fecha_actualizacion = ? WHERE id = ?`,
      [remoteId, now, localId],
      function (err) {
        if (err) {
          console.error('SQLite Error (update-product-remote-id):', err.message);
          reject(err.message);
        } else {
          console.log(`SQLite (update-product-remote-id): remote_id para localId ${localId} actualizado. Filas afectadas: ${this.changes}`);
          if (this.changes > 0) {
            db.get('SELECT * FROM productos WHERE id = ?', [localId], (err, row) => {
              if (err) {
                console.error('SQLite Error (update-product-remote-id - get after update):', err.message);
                reject(err.message);
              } else {
                console.log('SQLite (update-product-remote-id): Producto con remote_id actualizado recuperado:', JSON.stringify(row, null, 2));
                resolve(row);
              }
            });
          } else {
            console.warn(`SQLite (update-product-remote-id): No se encontró producto con localId ${localId} para actualizar remote_id.`);
            resolve(null);
          }
        }
      }
    );
  });
});

// --- Manejadores IPC para Clientes (SQLite) ---
ipcMain.handle('get-clients', async (event) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM clientes', [], (err, rows) => {
      if (err) {
        console.error('SQLite Error (get-clients):', err.message);
        reject(err.message);
      } else {
        console.log('SQLite (get-clients): Clientes obtenidos.');
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('add-client', async (event, client) => {
  return new Promise((resolve, reject) => {
    const { nombre, apellido, telefono, email, activo = 1 } = client;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO clientes (nombre, apellido, telefono, email, activo, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, telefono, email, activo ? 1 : 0, now, now],
      function (err) {
        if (err) {
          console.error('SQLite Error (add-client):', err.message);
          reject(err.message);
        } else {
          db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
              console.error('SQLite Error (add-client - get after insert):', err.message);
              reject(err.message);
            } else {
              console.log('SQLite (add-client): Cliente añadido y recuperado.');
              resolve(row);
            }
          });
        }
      }
    );
  });
});

// --- Manejadores IPC para ListasPrecio (SQLite) ---
ipcMain.handle('get-listas-precio', async (event) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM listas_precio', [], (err, rows) => {
      if (err) {
        console.error('SQLite Error (get-listas-precio):', err.message);
        reject(err.message);
      } else {
        console.log('SQLite (get-listas-precio): Listas de Precio obtenidas.');
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('add-lista-precio', async (event, lista) => {
  return new Promise((resolve, reject) => {
    const { nombre_lista, descripcion, tiene_comision, porcentaje_comision } = lista;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO listas_precio (nombre_lista, descripcion, activo, tiene_comision, porcentaje_comision, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre_lista, descripcion, 1, tiene_comision ? 1 : 0, porcentaje_comision, now, now],
      function (err) {
        if (err) {
          console.error('SQLite Error (add-lista-precio):', err.message);
          reject(err.message);
        } else {
          db.get('SELECT * FROM listas_precio WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
              console.error('SQLite Error (add-lista-precio - get after insert):', err.message);
              reject(err.message);
            } else {
              console.log('SQLite (add-lista-precio): Lista de Precio añadida y recuperada.');
              resolve(row);
            }
          });
        }
      }
    );
  });
});