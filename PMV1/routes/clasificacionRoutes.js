// Rutas de Clasificación
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ClasificacionController = require('../control/clasificacionController');
const AuthController = require('../control/authController');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/'));
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        cb(null, `clasificacion_${timestamp}_${req.session.usuario.id}${extension}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Verificar que sea una imagen
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no válido. Solo se permiten: JPG, PNG, WebP'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo
    }
});

// Middleware de autenticación para todas las rutas
router.use(AuthController.requireAuth);

// Ruta para mostrar página de clasificación
router.get('/', ClasificacionController.mostrarClasificar);
router.get('/clasificar', ClasificacionController.mostrarClasificar);

// Ruta para procesar clasificación de imagen
router.post('/procesar', upload.single('imagen'), ClasificacionController.procesarClasificacion);

// Ruta para obtener historial de clasificaciones del usuario
router.get('/historial', ClasificacionController.obtenerHistorial);

// Ruta para validar clasificación (solo administradores)
router.post('/:idClasificacion/validar', 
    AuthController.requireRole(['administrador']), 
    ClasificacionController.validarClasificacion
);

// Ruta para obtener estado del modelo IA
router.get('/modelo/estado', ClasificacionController.obtenerEstadoModelo);

// Manejo de errores de multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'Archivo demasiado grande. Máximo 10MB permitido' 
            });
        }
    }
    
    if (error.message.includes('Formato de archivo no válido')) {
        return res.status(400).json({ error: error.message });
    }
    
    next(error);
});

module.exports = router;