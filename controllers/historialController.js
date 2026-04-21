const { palmito } = require('../config/db');

const obtenerHistorialUsuario = async (req, res) => {
    const { id_usuario } = req.params;
    
    try {
        const result = await palmito.query(`
            SELECT 
                id_pedido, 
                fecha_pedido AS fecha, 
                total, 
                estado, 
                n_pedido_usuario
            FROM pedido 
            WHERE id_usuario = $1 
            ORDER BY fecha_pedido DESC
        `, [id_usuario]);

        console.log(`Consulta para usuario ${id_usuario}: ${result.rows.length} pedidos encontrados.`);
        res.json(result.rows);

    } catch (err) {
        console.error("Error en obtenerHistorialUsuario:", err.message);
        res.status(500).json({ error: "Error al consultar la base de datos" });
    }
};

const obtenerDetalleCompra = async (req, res) => {
    const { id_pedido } = req.params;
    try {
        const query = `
            SELECT 
                p.nombre_producto AS nombre, 
                p.imagen, 
                dp.cantidad, 
                dp.precio_unitario,
                (dp.cantidad * dp.precio_unitario) as subtotal
            FROM detalle_pedido dp
            JOIN producto p ON dp.id_producto = p.id_producto 
            WHERE dp.id_pedido = $1
        `;
        const result = await palmito.query(query, [id_pedido]);
        
        
        res.json(result.rows); 
    } catch (err) {
        console.error("Error en detalle historial:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    obtenerHistorialUsuario, 
    obtenerDetalleCompra 
};