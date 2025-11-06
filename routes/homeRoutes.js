// Rutas para la página de inicio
const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/homeController');

// Ruta principal - página de inicio
router.get('/', HomeController.mostrarInicio);

module.exports = router;