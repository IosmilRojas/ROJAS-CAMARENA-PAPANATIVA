// Rutas de Gestión de Usuarios
const express = require('express');
const router = express.Router();
const GestionUsuariosController = require('../controllers/gestionUsuariosController');
const AuthController = require('../controllers/authController');

// Middleware de autenticación para todas las rutas
router.use(AuthController.requireAuth);

// Middleware para verificar que es administrador
router.use(AuthController.requireRole(['administrador']));

// Ruta para mostrar página de gestión de usuarios
router.get('/', GestionUsuariosController.mostrarGestionUsuarios);

// Rutas API para gestión de usuarios
router.get('/api/usuarios', GestionUsuariosController.listarUsuarios);
router.get('/api/usuarios-desactivados', GestionUsuariosController.listarUsuariosDesactivados);
router.post('/api/usuarios', GestionUsuariosController.crearUsuario);
router.get('/api/usuarios/:id', GestionUsuariosController.obtenerUsuario);
router.put('/api/usuarios/:id', GestionUsuariosController.actualizarUsuario);
router.delete('/api/usuarios/:id', GestionUsuariosController.desactivarUsuario);
router.post('/api/usuarios/:id/eliminar-permanentemente', GestionUsuariosController.eliminarUsuario);
router.post('/api/usuarios/:id/cambiar-contraseña', GestionUsuariosController.cambiarContraseña);

module.exports = router;
