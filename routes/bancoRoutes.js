const express = require('express');
const router = express.Router();
const bancoController = require('../controllers/bancoController');

router.post('/pagar-tarjeta', bancoController.procesarPagoTarjeta);
router.post('/sinpe-movil', bancoController.procesarSinpeMovil);
router.get('/nombre/:telefono', bancoController.consultarNombrePorTelefono);
router.post('/pagar-paypal', bancoController.procesarPagoPaypal);

module.exports = router;