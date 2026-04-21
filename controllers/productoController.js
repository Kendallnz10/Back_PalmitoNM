const { palmito } = require('../config/db'); 

const getProductos = async (req, res) => {
    try {
        const query = `
            SELECT 
                id, 
                nombre, 
                descripcion, 
                precio, 
                stock, 
                imagen, 
                estado 
            FROM productos 
            WHERE estado = 'Disponible'
        `;
        const result = await palmito.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getProductos };