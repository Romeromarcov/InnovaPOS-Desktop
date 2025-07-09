// src/renderer/App.js
// Componente principal de tu aplicación React.
// Ahora con un retraso ajustado para asegurar la lectura de datos frescos de SQLite.

import React, { useState, useEffect } from 'react';
import ProductTable from './components/ProductTable'; // Importa el nuevo componente

// Accede a las APIs expuestas por el script de preload.js
const electronAPI = window.electronAPI;

function App() {
  // Estado para la autenticación
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [authMessage, setAuthMessage] = useState('');

  // Estado para la funcionalidad offline (SQLite)
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCost, setNewProductCost] = useState('');
  const [clients, setClients] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientApellido, setNewClientApellido] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [listasPrecio, setListasPrecio] = useState([]);
  const [newListNombre, setNewListNombre] = useState('');
  const [newListComision, setNewListComision] = useState('');

  const [message, setMessage] = useState(''); // Mensajes para operaciones SQLite
  const [syncKey, setSyncKey] = useState(0); // Para forzar re-renderizado de tabla

  // Cargar datos iniciales de SQLite al iniciar la app
  useEffect(() => {
    console.log('App.js loaded. window.electronAPI:', window.electronAPI);
    if (electronAPI) {
      loadProducts();
      loadClients();
      loadListasPrecio();
    } else {
      setMessage('electronAPI no disponible. ¿Estás ejecutando en Electron?');
    }
  }, []);

  // --- Funciones para la Base de Datos Local (SQLite) ---
  const loadProducts = async () => {
    try {
      console.log('loadProducts: Intentando cargar productos desde DB local...');
      const data = await electronAPI.getProducts();
      console.log('loadProducts: Productos obtenidos de DB local (antes de setProducts):', JSON.stringify(data, null, 2));
      const newData = data.map(product => ({ ...product })); // Copia cada objeto producto
      setProducts(newData); // Establece los nuevos productos directamente
      console.log('loadProducts: setProducts llamado con nueva referencia y objetos copiados.');
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setMessage(`Error al cargar productos: ${error.message || error}`);
    }
  };

  const handleAddProduct = async () => {
    if (!newProductName || !newProductSku || !newProductCost) {
      setMessage('Por favor, completa todos los campos del producto.');
      return;
    }
    try {
      const product = {
        nombre: newProductName,
        descripcion: 'Descripción de prueba',
        sku: newProductSku,
        costo_unitario: parseFloat(newProductCost),
        // remote_id se añadirá después de la sincronización al servidor
      };

      // 1. Añadir producto a la base de datos local (SQLite)
      const addedLocalProduct = await electronAPI.addProduct(product);
      setMessage(`Producto "${addedLocalProduct.nombre}" añadido localmente.`);

      // 2. Intentar sincronizar el producto con el servidor (si hay accessToken)
      if (accessToken) {
        setMessage(`Intentando sincronizar "${addedLocalProduct.nombre}" con el servidor...`);
        try {
          const serverResponse = await electronAPI.syncProductToServer({
            product: addedLocalProduct, // Envía el producto local
            accessToken: accessToken,
          });

          // Si la sincronización es exitosa, actualiza el producto local con el remote_id
          if (serverResponse && serverResponse.id) {
            await electronAPI.updateProductRemoteId(addedLocalProduct.id, serverResponse.id);
            setMessage(`Producto "${addedLocalProduct.nombre}" sincronizado con el servidor (ID Remoto: ${serverResponse.id}).`);
          } else {
            setMessage(`Producto "${addedLocalProduct.nombre}" añadido localmente, pero falló la sincronización con el servidor.`);
            console.warn('Sincronización de producto fallida:', serverResponse);
          }
        } catch (syncError) {
          setMessage(`Producto "${addedLocalProduct.nombre}" añadido localmente, pero falló la sincronización con el servidor: ${syncError.message}`);
          console.error('Error al sincronizar producto con el servidor:', syncError);
        }
      } else {
        setMessage(`Producto "${addedLocalProduct.nombre}" añadido localmente. Inicia sesión para sincronizar.`);
      }

      setNewProductName('');
      setNewProductSku('');
      setNewProductCost('');
      // Recargar productos después de añadir/sincronizar
      // === AÑADIR UN PEQUEÑO RETRASO ANTES DE RECARGAR (Aumentado a 200ms) ===
      setTimeout(async () => {
        await loadProducts(); // Esto debería forzar el refresco de la UI
        setSyncKey(prevKey => prevKey + 1); // Incrementa la key para forzar re-renderizado
      }, 200); // Retraso de 200ms

    } catch (error) {
      console.error('Error al añadir producto localmente:', error);
      setMessage(`Error al añadir producto localmente: ${error.message || error}`);
    }
  };

  const loadClients = async () => {
    try {
      const data = await electronAPI.getClients();
      setClients(data);
      setMessage('Clientes cargados desde la DB local.');
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setMessage(`Error al cargar clientes: ${error.message || error}`);
    }
  };

  const handleAddClient = async () => {
    if (!newClientName || !newClientApellido || !newClientEmail) {
      setMessage('Por favor, completa todos los campos del cliente.');
      return;
    }
    try {
      const client = {
        nombre: newClientName,
        apellido: newClientApellido,
        telefono: 'N/A',
        email: newClientEmail
      };
      const addedClient = await electronAPI.addClient(client);
      setClients([...clients, addedClient]);
      setNewClientName('');
      setNewClientApellido('');
      setNewClientEmail('');
      setMessage(`Cliente "${addedClient.nombre} ${addedClient.apellido}" añadido localmente.`);
    } catch (error) {
      console.error('Error al añadir cliente:', error);
      setMessage(`Error al añadir cliente: ${error.message || error}`);
    }
  };

  const loadListasPrecio = async () => {
    try {
      const data = await electronAPI.getListasPrecio();
      setListasPrecio(data);
      setMessage('Listas de Precio cargadas desde la DB local.');
    } catch (error) {
      console.error('Error al cargar listas de precio:', error);
      setMessage(`Error al cargar listas de precio: ${error.message || error}`);
    }
  };

  const handleAddListaPrecio = async () => {
    if (!newListNombre) {
      setMessage('Por favor, ingresa el nombre de la lista de precio.');
      return;
    }
    try {
      const lista = {
        nombre_lista: newListNombre,
        descripcion: 'Descripción de lista de precio',
        tiene_comision: newListComision ? true : false,
        porcentaje_comision: newListComision ? parseFloat(newListComision) : null
      };
      const addedLista = await electronAPI.addListaPrecio(lista);
      setListasPrecio([...listasPrecio, addedLista]);
      setNewListNombre('');
      setNewListComision('');
      setMessage(`Lista de Precio "${addedLista.nombre_lista}" añadida localmente.`);
    } catch (error) {
      console.error('Error al añadir lista de precio:', error);
      setMessage(`Error al añadir lista de precio: ${error.message || error}`);
    }
  };

  // --- Funciones para Autenticación JWT ---
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
    setAuthMessage('Iniciando sesión...');
    try {
      const data = await electronAPI.login({ username, password });
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      setAuthMessage('¡Inicio de sesión exitoso!');
      setUsername('');
      setPassword('');
      // TODO: En un paso posterior, almacenar estos tokens de forma segura (Firestore)
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      setAuthMessage(`Error de inicio de sesión: ${error.message}`);
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setAuthMessage('Sesión cerrada.');
    // TODO: En un paso posterior, eliminar tokens de almacenamiento seguro (Firestore)
  };

  // --- Función de Sincronización de Productos (Ejemplo de Petición Autenticada) ---
  const handleSyncProducts = async () => {
    if (!accessToken) {
      setMessage('Debes iniciar sesión para sincronizar datos.');
      return;
    }
    setMessage('Sincronizando productos con el servidor...');
    try {
      // 1. Obtener productos del servidor
      const remoteProducts = await electronAPI.authenticatedApiCall({
        url: '/productos/', // Endpoint de tu API de Django
        method: 'GET',
        accessToken: accessToken,
      });

      console.log('handleSyncProducts: Productos obtenidos del servidor:', JSON.stringify(remoteProducts, null, 2));

      // 2. Obtener productos locales actuales
      const localProducts = await electronAPI.getProducts(); // Obtener la lista más reciente
      const localProductMap = new Map(localProducts.map(p => [p.remote_id, p])); // Mapear por remote_id
      console.log('handleSyncProducts: Productos locales actuales (antes de fusión):', JSON.stringify(localProducts, null, 2));

      let addedCount = 0;
      let updatedCount = 0;

      // 3. Iterar sobre los productos remotos para fusionarlos con los locales
      for (const remoteProduct of remoteProducts) {
        const localProduct = localProductMap.get(remoteProduct.id); // remoteProduct.id es el remote_id para nosotros

        if (localProduct) {
          // El producto existe localmente (por su remote_id)
          // Compara fechas de actualización para resolver conflictos (simple: el servidor gana si es más nuevo)
          const localUpdatedAt = new Date(localProduct.fecha_actualizacion);
          const remoteUpdatedAt = new Date(remoteProduct.fecha_actualizacion);

          // Convertir activo de booleano a entero (o viceversa) si es necesario para la comparación
          const remoteActivo = remoteProduct.activo ? 1 : 0;
          const localActivo = localProduct.activo ? 1 : 0;

          // Compara si hay diferencias significativas (ignora ID local y fechas de creación/actualización por ahora)
          const hasChanges =
            localProduct.nombre !== remoteProduct.nombre ||
            localProduct.descripcion !== remoteProduct.descripcion ||
            localProduct.sku !== remoteProduct.sku ||
            localProduct.costo_unitario !== remoteProduct.costo_unitario ||
            localActivo !== remoteActivo; // Compara el estado activo

          if (hasChanges && remoteUpdatedAt > localUpdatedAt) {
            // El producto del servidor es más nuevo Y tiene cambios, actualizar el local
            await electronAPI.updateProductFromServer(remoteProduct);
            updatedCount++;
            console.log(`handleSyncProducts: Producto local actualizado: ${remoteProduct.nombre}`);
          } else if (hasChanges && remoteUpdatedAt <= localUpdatedAt) {
            // El producto local es más nuevo o igual, pero hay cambios.
            // Esto es un conflicto. Por ahora, el local gana. En el futuro, se manejaría.
            console.log(`handleSyncProducts: Conflicto detectado para ${remoteProduct.nombre}. La versión local es más reciente o igual. No se actualiza desde el servidor.`);
          } else if (!hasChanges) {
              console.log(`handleSyncProducts: Producto ${remoteProduct.nombre} sin cambios relevantes. No se actualiza.`);
          }
        } else {
          // El producto no existe localmente, añadirlo
          const productToAdd = {
            nombre: remoteProduct.nombre,
            descripcion: remoteProduct.descripcion,
            sku: remoteProduct.sku,
            costo_unitario: remoteProduct.costo_unitario,
            activo: remoteProduct.activo,
            fecha_creacion: remoteProduct.fecha_creacion,
            fecha_actualizacion: remoteProduct.fecha_actualizacion,
            remote_id: remoteProduct.id // Guarda el ID del servidor como remote_id
          };
          await electronAPI.addProduct(productToAdd);
          addedCount++;
          console.log(`handleSyncProducts: Producto remoto añadido localmente: ${remoteProduct.nombre}`);
        }
      }

      // 4. Después de la fusión, recargar la lista de productos local para actualizar la UI
      console.log('handleSyncProducts: Recargando productos para actualizar la UI...');
      // === AÑADIR UN PEQUEÑO RETRASO ANTES DE RECARGAR (Aumentado a 200ms) ===
      setTimeout(async () => {
        await loadProducts(); // Recarga los productos desde SQLite a la UI
        console.log('handleSyncProducts: loadProducts completado.');
        setSyncKey(prevKey => prevKey + 1); // Incrementa la key para forzar re-renderizado de la tabla
      }, 200); // Retraso de 200ms

      setMessage(`Sincronización completa: ${addedCount} añadidos, ${updatedCount} actualizados.`);

    } catch (error) {
      console.error('Error al sincronizar productos:', error);
      setMessage(`Error al sincronizar productos: ${error.message || error}`);
    }
  };


  // Renderizado condicional: Mostrar formulario de login o la aplicación principal
  if (!accessToken) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
        <h1>InnovaPOS Desktop</h1>
        <h2>Iniciar Sesión</h2>
        <p style={{ color: authMessage.includes('Error') ? 'red' : 'green' }}>{authMessage}</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Iniciar Sesión
          </button>
        </form>
      </div>
    );
  }

  // Si hay un token de acceso, mostrar la aplicación principal
  console.log('App.js: Renderizando con products (estado actual):', JSON.stringify(products, null, 2)); // Log para ver el estado actual de 'products'
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>InnovaPOS Desktop (Offline-First)</h1>
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Cerrar Sesión
        </button>
      </div>
      <p style={{ color: message.includes('Error') ? 'red' : 'green' }}>{message}</p>
      <p style={{ color: authMessage.includes('Error') ? 'red' : 'green' }}>{authMessage}</p>

      {/* Botón de Sincronización de Productos */}
      <button onClick={handleSyncProducts} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}>
        Sincronizar Productos con Servidor
      </button>

      {/* Sección de Productos */}
      <h2>Productos</h2>
      <div>
        <input
          type="text"
          placeholder="Nombre Producto"
          value={newProductName}
          onChange={(e) => setNewProductName(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <input
          type="text"
          placeholder="SKU"
          value={newProductSku}
          onChange={(e) => setNewProductSku(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <input
          type="number"
          placeholder="Costo Unitario"
          value={newProductCost}
          onChange={(e) => setNewProductCost(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleAddProduct} style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white' }}>
          Añadir Producto Local
        </button>
      </div>

      <h3 style={{ marginTop: '20px' }}>Lista de Productos Locales:</h3>
      {/* Usando el componente ProductTable */}
      <ProductTable products={products} syncKey={syncKey} />

      {/* Sección de Clientes */}
      <h2 style={{ marginTop: '40px' }}>Clientes</h2>
      <div>
        <input
          type="text"
          placeholder="Nombre Cliente"
          value={newClientName}
          onChange={(e) => setNewClientName(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <input
          type="text"
          placeholder="Apellido Cliente"
          value={newClientApellido}
          onChange={(e) => setNewClientApellido(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <input
          type="email"
          placeholder="Email Cliente"
          value={newClientEmail}
          onChange={(e) => setNewClientEmail(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleAddClient} style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white' }}>
          Añadir Cliente Local
        </button>
      </div>

      <h3 style={{ marginTop: '20px' }}>Lista de Clientes Locales:</h3>
      {clients.length === 0 ? (
        <p>No hay clientes en la base de datos local.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Nombre</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Apellido</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Email</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{client.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{client.nombre}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{client.apellido}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{client.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Sección de Listas de Precio */}
      <h2 style={{ marginTop: '40px' }}>Listas de Precio</h2>
      <div>
        <input
          type="text"
          placeholder="Nombre de la Lista"
          value={newListNombre}
          onChange={(e) => setNewListNombre(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <input
          type="number"
          placeholder="Comisión (%) (Opcional)"
          value={newListComision}
          onChange={(e) => setNewListComision(e.target.value)}
          style={{ marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleAddListaPrecio} style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white' }}>
          Añadir Lista de Precio Local
        </button>
      </div>

      <h3 style={{ marginTop: '20px' }}>Lista de Listas de Precio Locales:</h3>
      {listasPrecio.length === 0 ? (
        <p>No hay listas de precio en la base de datos local.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Nombre</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Comisión</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Activo</th>
            </tr>
          </thead>
          <tbody>
            {listasPrecio.map((lista) => (
              <tr key={lista.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{lista.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{lista.nombre_lista}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{lista.porcentaje_comision ? `${lista.porcentaje_comision}%` : 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{lista.activo ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </div>
  );
}

export default App;
