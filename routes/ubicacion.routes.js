const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');



// Obtener la lista de todos los países
router.get('/paises', ubicacionController.getPaises);

// Obtener provincias filtradas por el ID del país
router.get('/provincias/:idPais', ubicacionController.getProvincias);

// Obtener cantones filtrados por el ID de la provincia
router.get('/cantones/:idProvincia', ubicacionController.getCantones);

// Obtener distritos filtrados por el ID del cantón
router.get('/distritos/:idCanton', ubicacionController.getDistritos);

module.exports = router;