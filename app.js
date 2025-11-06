// Configuración principal Express - Arquitectura 4 capas
require('dotenv').config();  // Sin path, busca .env en raíz
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
const perfilRoutes = require('./routes/perfilRoutes');
const gestionUsuariosRoutes = require('./routes/gestionUsuariosRoutes');

const app = express();

// Configuración de EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware estático y parsers
app.use(express.static(path.join(__dirname, 'public')));
app.use('/web_model', express.static(path.join(__dirname, 'web_model')));  // Ruta directa
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

// Configuración de multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public', 'uploads'));  // Ruta completa
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

// Middleware para actualizar avatarUrl en sesión (sincronizar con BD)
app.use(async (req, res, next) => {
    try {
        if (req.session && req.session.usuario && req.session.usuario.id) {
            // Si avatarUrl no existe en sesión, buscarla en BD
            if (!req.session.usuario.avatarUrl) {
                const Usuario = require('./models/Usuario');
                const usuario = await Usuario.findById(req.session.usuario.id).select('avatarUrl');
                if (usuario && usuario.avatarUrl) {
                    req.session.usuario.avatarUrl = usuario.avatarUrl;
                    res.locals.usuario.avatarUrl = usuario.avatarUrl;
                }
            }
        }
    } catch (error) {
        console.error('Error actualizando avatarUrl:', error);
    }
    next();
});

// Rutas
app.use('/', homeRoutes);
app.use('/', authRoutes);
app.use('/perfil', perfilRoutes);  // Asegúrate que esta línea existe
app.use('/clasificacion', clasificacionRoutes);
app.use('/reportes', reporteRoutes);
app.use('/historial', historialRoutes);
app.use('/gestion-usuarios', gestionUsuariosRoutes);

// Manejo de errores 404 (debe ir al final)
app.use((req, res) => {
    res.status(404).render('error', { 
        mensaje: 'Página no encontrada', 
        codigo: 404 
    });
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', { 
        mensaje: 'Error interno del servidor', 
        codigo: 500 
    });
});

// Si se ejecuta directamente, conectar a la BD y arrancar servidor
if (require.main === module) {
    (async () => {
        console.log('\n🚀 Iniciando PapaIA Clasificador...\n');

        // Inicialización del modelo
        console.log('📡 Sistema de IA:');
        console.log('   └─ Modo: Híbrido (TensorFlow.js)');
        console.log(`   └─ Modelo: ${path.join(__dirname, 'web_model', 'model.json')}`);
        console.log('   └─ Clases: amarilla, huayro, peruanita\n');

        // Conexión a la base de datos
        console.log('🗄️  Base de Datos:');
        try {
            const conn = await connectDB();
            if (!conn) {
                console.log('   └─ Modo: Solo Frontend (sin BD)');
            } else {
                const dbName = conn.connection.name;
                const host = conn.connection.host;
                console.log('   └─ Tipo: MongoDB Atlas');
                console.log(`   └─ Base: ${dbName}`);
                console.log(`   └─ Host: ${host}`);
                console.log('   └─ Estado: ✅ Conectado\n');
            }
        } catch (err) {
            console.error('   └─ Error: ❌ ', err.message, '\n');
        }

        // Inicio del servidor
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log('🌐 Servidor Web:');
            console.log(`   └─ URL: http://localhost:${PORT}`);
            console.log(`   └─ Modo: ${process.env.NODE_ENV || 'development'}`);
            console.log('   └─ Estado: ✅ En línea\n');
        });
    })();
}

module.exports = app;