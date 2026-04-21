const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');

// Rutas
router.post('/enviar-codigo', usuariosController.enviarCodigoVerificacion);
router.post('/validar-codigo', usuariosController.validarCodigo);
router.post('/validar-cedula', usuariosController.validarCedulaTSE);
router.post('/registrar', usuariosController.registrarUsuario);
router.post('/login', usuariosController.loginUsuario);
router.post('/login-google', usuariosController.loginGoogle);
router.post('/login-facebook', usuariosController.loginConFacebook); 
router.post('/mfa/activar', usuariosController.activarMFA);
router.post('/mfa/verificar', usuariosController.verificarCodigoMFA);
router.post('/seguridad/preguntas', usuariosController.guardarPreguntasSeguridad);
router.post('/recuperar/obtener-preguntas', usuariosController.obtenerPreguntasPorCorreo);
router.post('/recuperar/verificar-respuestas', usuariosController.verificarRespuestasSeguridad);
router.post('/recuperar/restablecer-solo-pass', usuariosController.restablecerPasswordPostValidacion);
router.post('/recuperar/restablecer', usuariosController.restablecerCredenciales); 
router.put('/actualizar/:id', usuariosController.actualizarUsuario);
router.get('/listar', usuariosController.obtenerUsuarios);

module.exports = router;