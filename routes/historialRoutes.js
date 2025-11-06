// Rutas para el historial de clasificaciones
const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');

// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    next();
};

// Rutas del historial
router.get('/', requireAuth, historialController.mostrarHistorial);
router.get('/estadisticas', requireAuth, historialController.obtenerEstadisticasRapidas);
router.delete('/:id', requireAuth, historialController.eliminarClasificacion);

module.exports = router;