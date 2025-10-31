// Configuración principal Express - Arquitectura 4 capas
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const MongoStore = require('connect-mongo');

// Usar el helper de conexión ya existente en PMV1/basedatos/db.js
const connectDB = require('./basedatos/db');

// Importar rutas
const homeRoutes = require('./routes/homeRoutes');
const authRoutes = require('./routes/authRoutes');
const clasificacionRoutes = require('./routes/clasificacionRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const historialRoutes = require('./routes/historialRoutes');

const app = express();

// Configuración de EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'vista'));

// Middleware estático y parsers
app.use(express.static(path.join(__dirname, 'public')));
app.use('/web_model', express.static(path.join(__dirname, 'web_model')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'papaclasificador2024',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || process.env.MONGODB_LOCAL || 'mongodb://localhost:27017/papa_clasificador'
    }),
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
app.locals.upload = multer({ storage: storage });

// Middleware de logging y pasar usuario a vistas
app.use((req, res, next) => {
    if (req.path.includes('/clasificacion/procesar')) {
        console.log(`\nPETICIÓN RECIBIDA: ${req.method} ${req.path}`);
    }
    res.locals.usuario = req.session ? req.session.usuario : null;
    next();
});

// Rutas
app.use('/', homeRoutes);
app.use('/', authRoutes);
app.use('/clasificacion', clasificacionRoutes);
app.use('/reportes', reporteRoutes);
app.use('/historial', historialRoutes);

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('error', { mensaje: 'Página no encontrada', codigo: 404 });
});

// Si se ejecuta directamente, conectar a la BD y arrancar servidor
if (require.main === module) {
    (async () => {
        try {
            const conn = await connectDB(); // puede ser null si SKIP_DB=true o no hay URI
            if (!conn) console.log('No hay conexión a BD - continuando en modo solo frontend');
        } catch (err) {
            console.error('Fallo conexión Mongo (al iniciar):', err);
            // no salir forzosamente: dejamos que la app funcione en modo degradado
        }
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
    })();
}

module.exports = app;

// Helper para conectar a MongoDB reutilizando la conexión entre invocaciones (serverless-friendly)
//const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_LOCAL || 'mongodb://localhost:27017/PapasDB';

async function connectToMongo() {
    if (!MONGODB_URI) throw new Error('MONGODB_URI no definido en variables de entorno');
    // Reutilizar conexión si ya está abierta
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }
    // Opciones recomendadas
    const opts = {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
    };
    await mongoose.connect(MONGODB_URI, opts);
    return mongoose;
}

module.exports = { connectToMongo };