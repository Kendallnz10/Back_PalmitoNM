const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'TSE',
    password: 'Paulita20',
    port: 5432,
});
const consultarCedula = async (req, res) => {
    try {
        const { cedula } = req.params;
        const cedulaLimpia = cedula.replace(/-/g, '').trim();

        const result = await pool.query(
            "SELECT nombre, primer_apellido, segundo_apellido, pais, provincia, canton, distrito FROM padron_nacional WHERE cedula = $1", 
            [cedulaLimpia]
        );

        if (result.rows.length > 0) {
            res.json({ encontrado: true, datos: result.rows[0] });
        } else {
            res.status(404).json({ encontrado: false, datos: null });
        }
    } catch (err) {
        console.error("Error DB:", err.message);
        res.status(500).json({ encontrado: false, datos: null, error: err.message });
    }
};

module.exports = { consultarCedula };