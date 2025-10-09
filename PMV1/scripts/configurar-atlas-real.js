// Script para configurar y probar MongoDB Atlas
const mongoose = require('mongoose');
require('dotenv').config();

async function probarConexionAtlas() {
    console.log('🔧 Probando conexión a MongoDB Atlas...');
    
    // URI que vi en los logs (necesitas reemplazar con la contraseña correcta)
    const atlasURI = 'mongodb+srv://iosmilrojas:TU_PASSWORD_AQUI@cluster0.yczwuya.mongodb.net/PapasDB?retryWrites=true&w=majority&appName=Cluster0';
    
    try {
        console.log('🔗 Conectando a Atlas...');
        console.log(`📍 Cluster: cluster0.yczwuya.mongodb.net`);
        console.log(`📊 Base de datos: PapasDB`);
        console.log(`👤 Usuario: iosmilrojas`);
        
        const conn = await mongoose.connect(atlasURI, {
            serverSelectionTimeoutMS: 15000, // 15 segundos
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            retryWrites: true,
        });

        console.log('✅ ¡Conexión exitosa a MongoDB Atlas!');
        console.log(`🏠 Host: ${conn.connection.host}`);
        console.log(`📊 Base de datos: ${conn.connection.name}`);
        console.log(`🔌 Estado: Conectado`);
        
        // Probar operación básica
        console.log('\n🧪 Probando operación de prueba...');
        const testCollection = conn.connection.db.collection('test_conexion');
        const testDoc = {
            mensaje: 'Prueba de conexión Atlas',
            fecha: new Date(),
            desde: 'Script de configuración'
        };
        
        const resultado = await testCollection.insertOne(testDoc);
        console.log('✅ Documento de prueba insertado:', resultado.insertedId);
        
        // Limpiar documento de prueba
        await testCollection.deleteOne({ _id: resultado.insertedId });
        console.log('🧹 Documento de prueba eliminado');
        
        await mongoose.disconnect();
        console.log('\n🎉 ¡MongoDB Atlas está configurado correctamente!');
        console.log('\n📝 Para usar en la aplicación, actualiza el archivo .env con:');
        console.log(`MONGODB_URI=${atlasURI.replace(/TU_PASSWORD_AQUI/, 'TU_PASSWORD_REAL')}`);
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Error conectando a MongoDB Atlas:');
        console.error(`   Mensaje: ${error.message}`);
        
        if (error.message.includes('authentication failed')) {
            console.log('\n🔑 Problemas de autenticación:');
            console.log('   • Verifica el usuario y contraseña');
            console.log('   • Asegúrate de que el usuario tenga permisos en la BD');
        }
        
        if (error.message.includes('connection attempt failed')) {
            console.log('\n🌐 Problemas de conexión:');
            console.log('   • Verifica tu conexión a internet');
            console.log('   • Revisa la lista de IPs permitidas en Atlas');
            console.log('   • Permite acceso desde cualquier IP (0.0.0.0/0) para pruebas');
        }
        
        console.log('\n🛠️  Pasos para solucionar:');
        console.log('1. Ve a MongoDB Atlas Dashboard');
        console.log('2. Cluster → Connect → Drivers');
        console.log('3. Copia la cadena de conexión correcta');
        console.log('4. Network Access → Add IP Address → Allow access from anywhere');
        console.log('5. Database Access → Verifica permisos del usuario');
        
        return false;
    }
}

async function configurarEnv(uri) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const envPath = path.join(__dirname, '../.env');
    
    try {
        let contenidoEnv = `# Configuración de MongoDB Atlas
MONGODB_URI=${uri}

# Configuración local de respaldo  
MONGODB_LOCAL=mongodb://localhost:27017/PapasDB

# Configuración de sesión
SESSION_SECRET=papaclasificador2024_secret_key_production

# Configuración del servidor
PORT=3000
NODE_ENV=production
`;

        await fs.writeFile(envPath, contenidoEnv, 'utf8');
        console.log('✅ Archivo .env actualizado correctamente');
        
    } catch (error) {
        console.error('❌ Error actualizando .env:', error.message);
    }
}

// Ejecutar configuración interactiva
async function configurarInteractivo() {
    console.log('🚀 Configurador de MongoDB Atlas\n');
    
    console.log('📋 Información necesaria:');
    console.log('   • Usuario de MongoDB Atlas');
    console.log('   • Contraseña del usuario');
    console.log('   • Nombre del cluster');
    console.log('   • Nombre de la base de datos\n');
    
    console.log('🔗 URI de ejemplo:');
    console.log('mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/PapasDB?retryWrites=true&w=majority');
    
    console.log('\n⚡ Para continuar, edita este script y reemplaza TU_PASSWORD_AQUI con tu contraseña real');
    console.log('   Luego ejecuta: node scripts/configurar-atlas.js');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        configurarInteractivo();
    } else if (args[0] === 'probar') {
        probarConexionAtlas();
    } else {
        const uri = args[0];
        configurarEnv(uri).then(() => {
            console.log('✅ Configuración completada');
            process.exit(0);
        });
    }
}

module.exports = { probarConexionAtlas, configurarEnv };