const express = require('express');
const router = express.Router();

const tseController = require('../controllers/tseController'); 


router.get('/buscar/:cedula', tseController.consultarCedula);

module.exports = router;