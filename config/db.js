const { Pool } = require('pg');

// Tu URL interna de Render (la que me pasaste)
const internalConnectionString = 'postgresql://admin_palmito:0Q5SNVmqhiTTjwMMhGmFqiZyQcTvrie@dpg-d7jsjse7r5hc738gfvcg-a/palmito_principal';

// Configuración base reutilizable
const baseConfig = {
    connectionString: internalConnectionString,
    ssl: {
        rejectUnauthorized: false // Necesario para Render
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

/**
 * Creamos las 3 conexiones.
 * Render permite usar la misma cadena de conexión y solo cambiar la base de datos
 * al final para acceder a otros esquemas en el mismo clúster.
 */

// 1. Base de Datos Principal (Palmito)
const palmito = new Pool({ 
    ...baseConfig 
});

// 2. Base de Datos TSE
const tse = new Pool({ 
    ...baseConfig, 
    connectionString: internalConnectionString.replace('/palmito_principal', '/tse_db') 
});

// 3. Base de Datos Banco
const banco = new Pool({ 
    ...baseConfig, 
    connectionString: internalConnectionString.replace('/palmito_principal', '/banco_db') 
});

// --- MENSAJES DE CONFIRMACIÓN ---
palmito.on('connect', () => console.log('✅ Backend conectado a: palmito_principal (Interno)'));
tse.on('connect', () => console.log('✅ Backend conectado a: tse_db (Interno)'));
banco.on('connect', () => console.log('✅ Backend conectado a: banco_db (Interno)'));

// --- MANEJO DE ERRORES ---
const handleErrors = (pool, name) => {
    pool.on('error', (err) => {
        console.error(`❌ Error inesperado en la base ${name}:`, err.message);
    });
};

handleErrors(palmito, 'Palmito');
handleErrors(tse, 'TSE');
handleErrors(banco, 'Banco');

module.exports = { palmito, tse, banco };