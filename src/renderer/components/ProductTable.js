// src/renderer/components/ProductTable.js
import React, { useEffect } from 'react';

/**
 * Componente funcional para renderizar la tabla de productos.
 * Recibe la lista de productos y una 'key' para forzar el re-renderizado.
 *
 * @param {object} props - Las propiedades del componente.
 * @param {Array<object>} props.products - La lista de productos a mostrar.
 * @param {number} props.syncKey - Una clave que cambia para forzar el re-renderizado de la tabla.
 */
function ProductTable({ products, syncKey }) {
  // Log cuando el componente se renderiza o sus props cambian
  useEffect(() => {
    console.log('ProductTable: Componente renderizado/props actualizadas.');
    console.log('ProductTable: products prop:', JSON.stringify(products, null, 2));
    console.log('ProductTable: syncKey prop:', syncKey);
  }, [products, syncKey]); // Dependencias: se ejecuta cuando products o syncKey cambian

  if (products.length === 0) {
    console.log('ProductTable: No hay productos, mostrando mensaje.');
    return <p>No hay productos en la base de datos local.</p>;
  }

  console.log('ProductTable: Renderizando tabla con productos.');
  return (
    // La 'key' se aplica a la tabla para forzar su re-renderizado completo
    // cuando syncKey cambia, asegurando que React re-evalúe todo su contenido.
    <table key={syncKey} style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
      <thead>
        <tr style={{ backgroundColor: '#f2f2f2' }}>
          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID Local</th>
          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID Remoto</th>
          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Nombre</th>
          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>SKU</th>
          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Costo</th>
          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Activo</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {
          console.log('ProductTable: Mapeando producto para fila:', JSON.stringify(product, null, 2));
          return (
            // La 'key' en cada fila es crucial para que React identifique de forma única cada elemento
            // y optimice las actualizaciones de la lista. Usamos el ID local que es único.
            <tr key={product.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.id}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.remote_id || 'N/A'}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.nombre}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.sku}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.costo_unitario}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.activo ? 'Sí' : 'No'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default ProductTable;
