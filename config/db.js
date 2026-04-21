const { Pool } = require('pg');

// Esta es la URL interna corregida con la "M" extra que viste en el panel
const internalConnectionString = 'postgresql://admin_palmito:0Q5SNVmqhiTTjwWMmhGmFqiZyQcTvrie@dpg-d7jsjse7r5hc738gfvcg-a/palmito_principal';

/**
 * Configuración base.
 * Priorizamos process.env.DATABASE_URL si la configuraste en el panel de Render,
 * de lo contrario usamos la cadena corregida.
 */
const baseConfig = {
    connectionString: process.env.DATABASE_URL || internalConnectionString,
    ssl: {
        rejectUnauthorized: false // Requerido para servidores en la nube como Render
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

// --- CREACIÓN DE LAS CONEXIONES ---

// 1. Conexión Principal (Palmito)
const palmito = new Pool({ 
    ...baseConfig 
});

// 2. Conexión TSE (Cambiamos el nombre de la base de datos en la URL)
const tse = new Pool({ 
    ...baseConfig, 
    connectionString: (process.env.DATABASE_URL || internalConnectionString).replace('/palmito_principal', '/tse_db') 
});

// 3. Conexión Banco (Cambiamos el nombre de la base de datos en la URL)
const banco = new Pool({ 
    ...baseConfig, 
    connectionString: (process.env.DATABASE_URL || internalConnectionString).replace('/palmito_principal', '/banco_db') 
});

// --- MENSAJES DE ESTADO EN CONSOLA ---
palmito.on('connect', () => console.log('✅ Conexión exitosa: palmito_principal'));
tse.on('connect', () => console.log('✅ Conexión exitosa: tse_db'));
banco.on('connect', () => console.log('✅ Conexión exitosa: banco_db'));

// --- MANEJO DE ERRORES ---
const handleErrors = (pool, name) => {
    pool.on('error', (err) => {
        console.error(`❌ Error en pool ${name}:`, err.message);
    });
};

handleErrors(palmito, 'Palmito');
handleErrors(tse, 'TSE');
handleErrors(banco, 'Banco');

module.exports = { palmito, tse, banco };