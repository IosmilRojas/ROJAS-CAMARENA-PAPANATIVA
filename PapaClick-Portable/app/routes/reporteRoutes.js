// Rutas de Reportes
const express = require('express');
const router = express.Router();
const ReporteController = require('../control/reporteController');
const UsuarioController = require('../control/usuarioController');
const AuthController = require('../control/authController');

// Middleware de autenticación para todas las rutas
router.use(AuthController.requireAuth);

// Ruta para mostrar página de reportes
router.get('/', ReporteController.mostrarReportes);
router.get('/reportes', ReporteController.mostrarReportes);

// Ruta para obtener estadísticas en formato JSON
router.get('/api/estadisticas', ReporteController.obtenerEstadisticas);

// Ruta para exportar reporte
router.get('/api/exportar', ReporteController.exportarReporte);

// Ruta para obtener trazabilidad de una clasificación específica
router.get('/api/trazabilidad/:idClasificacion', ReporteController.obtenerTrazabilidad);

// === RUTAS DE GESTIÓN DE USUARIOS (solo administradores) ===

// Ruta para crear usuario (solo administradores)
router.post('/api/usuarios', 
    AuthController.requireRole(['administrador']), 
    UsuarioController.crearUsuario
);

// Ruta para listar usuarios (solo administradores)
router.get('/api/usuarios', 
    AuthController.requireRole(['administrador']), 
    UsuarioController.listarUsuarios
);

// Ruta para obtener usuario específico
router.get('/api/usuarios/:idUsuario', UsuarioController.obtenerUsuario);

// Ruta para actualizar usuario
router.put('/api/usuarios/:idUsuario', UsuarioController.actualizarUsuario);

// Ruta para cambiar contraseña
router.post('/api/usuarios/:idUsuario/cambiar-contraseña', UsuarioController.cambiarContraseña);

// Ruta para desactivar usuario (solo administradores)
router.delete('/api/usuarios/:idUsuario', 
    AuthController.requireRole(['administrador']), 
    UsuarioController.desactivarUsuario
);

// Ruta para obtener estadísticas de usuarios (solo administradores)
router.get('/api/usuarios-estadisticas', 
    AuthController.requireRole(['administrador']), 
    UsuarioController.obtenerEstadisticas
);

module.exports = router;