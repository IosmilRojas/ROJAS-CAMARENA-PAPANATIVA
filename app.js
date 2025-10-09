// Configuración principal Express - Arquitectura 4 capas
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const MongoStore = require('connect-mongo');

// Importar conexión a base de datos
const connectDB = require('./PMV1/basedatos/db');

// Importar rutas
const authRoutes = require('./PMV1/routes/authRoutes');
const clasificacionRoutes = require('./PMV1/routes/clasificacionRoutes');
const reporteRoutes = require('./PMV1/routes/reporteRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a base de datos
connectDB();

// Configuración de EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'vista'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'papaclasificador2024',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://...'
    }),
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
app.locals.upload = multer({ storage: storage });

// Middleware de autenticación
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    next();
});

// Rutas
app.use('/', authRoutes);
app.use('/clasificacion', clasificacionRoutes);
app.use('/reportes', reporteRoutes);

// Ruta por defecto
app.get('/', (req, res) => {
    if (req.session.usuario) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('error', { 
        mensaje: 'Página no encontrada',
        codigo: 404
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});

module.exports = app;