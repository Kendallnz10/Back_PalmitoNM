const express = require('express');
const router = express.Router();
const carritoController = require('../controllers/carritoController');

router.get('/:id_usuario', carritoController.obtenerCarrito);

router.post('/agregar', carritoController.agregarAlCarrito);

router.put('/actualizar', carritoController.actualizarCantidad); 

router.delete('/eliminar/:id_usuario/:id_producto', carritoController.eliminarProducto); 

router.post('/procesar-pago', carritoController.procesarPago);


module.exports = router;