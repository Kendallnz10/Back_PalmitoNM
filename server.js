const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { palmito } = require('./config/db'); // Pool de Postgres

const app = express();
const port = process.env.PORT || 3000;

// ==============================================
// 🔹 1. VERIFICAR CONEXIÓN A POSTGRES
// ==============================================
(async () => {
  try {
    await palmito.query('SELECT NOW()');
    console.log('==============================================');
    console.log('✓ Base de datos PostgreSQL: Palmito_NM conectada');
  } catch (err) {
    console.log('==============================================');
    console.error('✘ Error de conexión a la DB:', err.message);
  }
})();

// ==============================================
// 🔹 2. MIDDLEWARES
// ==============================================
app.use(cors({
  origin: '*', // Permitir conexiones desde cualquier IP (Celular/Web)
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================================
// 🔹 3. LOG DE PETICIONES (DEBUG PRO)
// ==============================================
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// ==============================================
// 🔹 4. IMPORTAR RUTAS
// ==============================================
const usuarioRoutes   = require('./routes/usuario.routes');
const productoRoutes  = require('./routes/producto.routes');
const carritoRoutes   = require('./routes/carrito.routes');
const historialRoutes = require('./routes/historial.routes');
const ubicacionRoutes = require('./routes/ubicacion.routes');
const tseRoutes       = require('./routes/tse.routes');
const bancoRoutes     = require('./routes/bancoRoutes');
const bccrRoutes      = require('./routes/bccr.routes');
const paypalRoutes    = require('./routes/paypal.routes'); 

// ==============================================
// 🔹 5. MONTAR RUTAS
// ==============================================
app.use('/usuarios', usuarioRoutes);
app.use('/productos', productoRoutes);
app.use('/carrito', carritoRoutes);
app.use('/historial', historialRoutes);
app.use('/ubicacion', ubicacionRoutes);
app.use('/tse', tseRoutes);
app.use('/banco', bancoRoutes);
app.use('/tipo-cambio', bccrRoutes);
app.use('/paypal', paypalRoutes);

// ==============================================
// 🔹 6. RUTA BASE (TEST)
// ==============================================
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Servidor Palmito NM activo 🚀',
    estado: 'Conexión externa habilitada',
    endpoints: [
      '/usuarios', '/productos', '/carrito', '/historial', 
      '/ubicacion', '/tse', '/banco', '/tipo-cambio', '/paypal'
    ]
  });
});

// ==============================================
// 🔹 7. MANEJO DE ERRORES GLOBAL
// ==============================================
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.stack);
  res.status(500).json({
    success: false,
    mensaje: 'Error interno del servidor',
    error: err.message
  });
});

// ==============================================
// 🔹 8. 404 HANDLER
// ==============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    mensaje: 'Ruta no encontrada'
  });
});

// ==============================================
// 🔹 9. INICIAR SERVIDOR (CONFIGURADO PARA RED LOCAL)
// ==============================================
// Usamos '0.0.0.0' para que acepte conexiones externas en la red Wi-Fi
app.listen(port, '0.0.0.0', () => {
  console.log('==============================================');
  console.log(`✓ Servidor Palmito NM disponible en red local`);
  console.log(`✓ URL Local: http://localhost:${port}`);
  // Aquí es donde pondrías tu IP, ej: http://192.168.0.15:3000
  console.log('==============================================');
  console.log('✓ Rutas activas listas para recibir peticiones');
  console.log('==============================================');
});