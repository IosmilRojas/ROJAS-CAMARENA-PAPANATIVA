// Rutas de Autenticación
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Ruta para mostrar página de login
router.get('/login', AuthController.mostrarLogin);

// Ruta para procesar login
router.post('/login', AuthController.procesarLogin);

// Ruta para mostrar dashboard (requiere autenticación)
router.get('/dashboard', AuthController.requireAuth, AuthController.mostrarDashboard);

// Ruta para cerrar sesión
router.post('/logout', AuthController.cerrarSesion);
router.get('/logout', AuthController.cerrarSesion);

// Ruta para procesar registro de usuario
router.post('/registro', AuthController.procesarRegistro);

// Ruta para verificar disponibilidad de correo
router.post('/verificar-correo', AuthController.verificarCorreo);

// Ruta para obtener perfil del usuario actual
router.get('/api/perfil', AuthController.obtenerPerfil);

// Middleware para proteger rutas que requieren autenticación
router.use('/api/*', AuthController.requireAuth);

module.exports = router;