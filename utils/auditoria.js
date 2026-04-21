const { palmito } = require('../config/db');

/**
 * Registra eventos en la tabla Bitacora_Movimientos.
 * Usa un bloque try/catch para que fallos en la bitácora no detengan el sistema.
 */
const registrarBitacora = async (id_usuario, accion, detalle) => {
    if (!id_usuario) return;

    try {
        // Ajustado a tus nombres de columna reales
        const query = `
            INSERT INTO Bitacora_Movimientos (ID_Usuario, Accion, Detalle, Fecha_Hora) 
            VALUES ($1, $2, $3, NOW())
        `;
        await palmito.query(query, [id_usuario, accion, detalle]);
    } catch (error) {
        console.error(`[ERROR BITÁCORA]: ${error.message}`);
    }
};

module.exports = { registrarBitacora };