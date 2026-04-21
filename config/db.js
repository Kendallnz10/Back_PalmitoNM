const { Pool } = require('pg');

// Configuración de conexión base
const config = {
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

// --- CONEXIONES DIRECTAS ---
// Usamos las URLs internas que son más estables dentro de Render
const palmito = new Pool({ 
    ...config, 
    connectionString: 'postgresql://admin_palmito:0Q5SNVmqhiTTjwWMmhGmFqiZyQcTvrie@dpg-d7jsjse7r5hc738gfvcg-a/palmito_principal' 
});

const tse = new Pool({ 
    ...config, 
    connectionString: 'postgresql://admin_palmito:0Q5SNVmqhiTTjwWMmhGmFqiZyQcTvrie@dpg-d7jsjse7r5hc738gfvcg-a/tse_db' 
});

const banco = new Pool({ 
    ...config, 
    connectionString: 'postgresql://admin_palmito:0Q5SNVmqhiTTjwWMmhGmFqiZyQcTvrie@dpg-d7jsjse7r5hc738gfvcg-a/banco_db' 
});

// Mensajes de confirmación
palmito.on('connect', () => console.log('✅ Conectado a: palmito_principal'));
tse.on('connect', () => console.log('✅ Conectado a: tse_db'));
banco.on('connect', () => console.log('✅ Conectado a: banco_db'));

const handleErrors = (pool, name) => {
    pool.on('error', (err) => console.error(`❌ Error en ${name}:`, err.message));
};

handleErrors(palmito, 'Palmito');
handleErrors(tse, 'TSE');
handleErrors(banco, 'Banco');

module.exports = { palmito, tse, banco };