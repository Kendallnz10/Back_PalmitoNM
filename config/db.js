const { Pool } = require('pg');

// Configuración Base
const configBase = {
    user: 'postgres',
    password: 'Paulita20', // Tu contraseña actual
    host: 'localhost',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const palmito = new Pool({ ...configBase, database: 'Palmito_NM' });
const tse = new Pool({ ...configBase, database: 'TSE' });
const banco = new Pool({ ...configBase, database: 'Banco_Central' }); 

// Verificaciones de conexión
palmito.on('connect', () => console.log('Conectado a Palmito_NM'));
tse.on('connect', () => console.log('Conectado a TSE'));
banco.on('connect', () => console.log('Conectado a Banco_Central'));

module.exports = { palmito, tse, banco };