// Configuración y conexión a MongoDB Atlas
const mongoose = require('mongoose');
require('dotenv').config();

// Si quieres evitar la conexión (ej: build / pruebas), exportamos un stub cuando SKIP_DB=true
if (process.env.SKIP_DB === 'true') {
  console.log('SKIP_DB=true → omitiendo conexión a MongoDB (dev/build mode)');
  module.exports = async () => null;
}

const connectDB = async () => {
    try {
        // Validar URI de MongoDB Atlas
        let mongoURI = process.env.MONGODB_URI;
        let connectionType = 'Atlas';
        
        // Verificar si es una URI válida de Atlas
        if (!mongoURI || 
            mongoURI.includes('username:password') || 
            mongoURI.includes('xxxxx') ||
            mongoURI.includes('TU_PASSWORD') ||
            mongoURI.includes('tu_password')) {
            console.log('URI de MongoDB Atlas no configurada o contiene placeholder');
            console.log('Por favor configura la contraseña real en el archivo .env');
            console.log('Usando MongoDB Local como alternativa...');
            mongoURI = process.env.MONGODB_LOCAL || 'mongodb://localhost:27017/PapasDB';
            connectionType = 'Local';
        }
        
        console.log(`Conectando a MongoDB ${connectionType}...`);
        console.log(`URI: ${mongoURI.replace(/\/\/.*:.*@/, '//***:***@')}`); // Ocultar credenciales
        
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000, // 10 segundos para Atlas
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            retryWrites: true,
        });

        console.log(`MongoDB ${connectionType} conectado exitosamente!`);
        console.log(`Host: ${conn.connection.host}`);
        console.log(`Base de datos: ${conn.connection.name}`);
        console.log(`Estado: ${conn.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
        
        return conn;
        
    } catch (error) {
        console.error('Error conectando a MongoDB Atlas:', error.message);
        
        // Intentar conexión local como fallback solo si no estaba ya usando local
        if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('mongodb+srv://')) {
            console.log('Intentando conexión local de respaldo...');
            
            try {
                const localURI = 'mongodb://localhost:27017/PapasDB';
                const conn = await mongoose.connect(localURI, {
                    serverSelectionTimeoutMS: 3000,
                });
                
                console.log(`Conectado a MongoDB Local: ${conn.connection.host}`);
                console.log(`Base de datos: ${conn.connection.name}`);
                return conn;
                
            } catch (fallbackError) {
                console.error('Error en conexión local de respaldo:', fallbackError.message);
            }
        }
        
        // Mostrar guía de configuración
        console.log('\nGUÍA DE CONFIGURACIÓN:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('1️ Para MongoDB Atlas:');
        console.log('   • Ve a https://cloud.mongodb.com');
        console.log('   • Crea un cluster (gratis)');
        console.log('   • Copia la cadena de conexión');
        console.log('   • Actualiza MONGODB_URI en .env');
        console.log('');
        console.log('2️Para MongoDB Local:');
        console.log('   • Instala: https://www.mongodb.com/try/download/community');
        console.log('   • O usa Docker: docker run -d -p 27017:27017 --name mongodb mongo');
        console.log('');
        console.log('3️Formato de URI Atlas:');
        console.log('   mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/PapasDB');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Continuar sin BD para permitir desarrollo del frontend
        console.log('Continuando sin base de datos - Solo funcionalidad frontend disponible');
        return null;
    }
};

// Manejo de eventos de conexión
mongoose.connection.on('connected', () => {
    console.log('Mongoose conectado exitosamente');
});

mongoose.connection.on('error', (err) => {
    console.error(' Error de conexión MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose desconectado de MongoDB');
});

// Cerrar conexión cuando la aplicación termine
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Conexión MongoDB cerrada por terminación de aplicación');
    process.exit(0);
});

module.exports = connectDB;