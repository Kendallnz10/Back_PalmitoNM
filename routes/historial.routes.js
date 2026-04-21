const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');


router.get('/:id_usuario', historialController.obtenerHistorialUsuario);
router.get('/detalle/:id_pedido', historialController.obtenerDetalleCompra);

module.exports = router;