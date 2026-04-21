const { Pool } = require('pg');

// Configuración obtenida de tu panel de Render
const configRender = {
    user: 'admin_palmito', 
    password: '0Q5SNVmqhiTTjwMMhGmFqiZyQcTvrie', 
    host: 'dpg-d7jsjse7r5hc738gfvcg-a.ohio-postgres.render.com', 
    port: 5432,
    ssl: {
        rejectUnauthorized: false // Requerido para conectar a Render
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

// Conexiones a tus 3 bases de datos en el mismo clúster
const palmito = new Pool({ ...configRender, database: 'palmito_principal' });
const tse = new Pool({ ...configRender, database: 'tse_db' });
const banco = new Pool({ ...configRender, database: 'banco_db' }); 

// Mensajes de confirmación en consola
palmito.on('connect', () => console.log('✅ Backend conectado a: palmito_principal (Render)'));
tse.on('connect', () => console.log('✅ Backend conectado a: tse_db (Render)'));
banco.on('connect', () => console.log('✅ Backend conectado a: banco_db (Render)'));

// Manejo de errores globales por si se cae la conexión
const handleErrors = (pool, name) => {
    pool.on('error', (err) => {
        console.error(`❌ Error inesperado en la base ${name}:`, err);
    });
};

handleErrors(palmito, 'Palmito');
handleErrors(tse, 'TSE');
handleErrors(banco, 'Banco');

module.exports = { palmito, tse, banco };