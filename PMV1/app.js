// Configuración principal Express - Arquitectura 4 capas
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const MongoStore = require('connect-mongo');

// Importar conexión a base de datos
const connectDB = require('./basedatos/db');

// Importar rutas
const homeRoutes = require('./routes/homeRoutes');
const authRoutes = require('./routes/authRoutes');
const clasificacionRoutes = require('./routes/clasificacionRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const historialRoutes = require('./routes/historialRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a base de datos
connectDB();

// Configuración de EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'vista'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/web_model', express.static(path.join(__dirname, 'web_model'))); // Servir archivos del modelo TensorFlow
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'papaclasificador2024',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/papa_clasificador'
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

// Middleware de logging para debug
app.use((req, res, next) => {
    if (req.path.includes('/clasificacion/procesar')) {
        console.log(`\nPETICIÓN RECIBIDA: ${req.method} ${req.path}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`Usuario en sesión: ${req.session.usuario ? req.session.usuario.nombre : 'NO LOGUEADO'}`);
        console.log(`Archivos adjuntos: ${req.files ? Object.keys(req.files).length : 0}`);
        console.log(`Body size: ${JSON.stringify(req.body).length} chars`);
    }
    next();
});

// Middleware de autenticación
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    next();
});

// Rutas
app.use('/', homeRoutes); // Ruta de inicio
app.use('/', authRoutes); // Rutas de autenticación
app.use('/clasificacion', clasificacionRoutes);
app.use('/reportes', reporteRoutes);
app.use('/historial', historialRoutes);

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('error', { 
        mensaje: 'Página no encontrada',
        codigo: 404
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🥔 Servidor PMV1 ejecutándose en puerto ${PORT}`);
    console.log(`🌐 Accede a: http://localhost:${PORT}`);
});

// Evitar hacer app.listen cuando se requiera como módulo (Vercel)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

module.exports = app;

// Helper para conectar a MongoDB reutilizando la conexión entre invocaciones (serverless-friendly)
const mongoose = require('mongoose');

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
        // useNewUrlParser/useUnifiedTopology no son necesarios en mongoose 6+
    };
    await mongoose.connect(MONGODB_URI, opts);
    return mongoose;
}

module.exports = { connectToMongo };