const { palmito } = require('../config/db'); 

const getPaises = async (req, res) => {
    try {
        const result = await palmito.query('SELECT * FROM pais ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener países", error: error.message });
    }
};

const getProvincias = async (req, res) => {
    try {
        const { idPais } = req.params;
        // Cambiamos @id por $1
        const result = await palmito.query(
            'SELECT * FROM provincia WHERE id_pais = $1 ORDER BY nombre', 
            [idPais]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener provincias", error: error.message });
    }
};

const getCantones = async (req, res) => {
    try {
        const { idProvincia } = req.params;
        const result = await palmito.query(
            'SELECT * FROM canton WHERE id_provincia = $1 ORDER BY nombre', 
            [idProvincia]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener cantones", error: error.message });
    }
};

const getDistritos = async (req, res) => {
    try {
        const { idCanton } = req.params;
        const result = await palmito.query(
            'SELECT * FROM distrito WHERE id_canton = $1 ORDER BY nombre', 
            [idCanton]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener distritos", error: error.message });
    }
};

module.exports = {
    getPaises,
    getProvincias,
    getCantones,
    getDistritos
};