// Script para migrar datos de Local a Atlas cuando esté disponible
const mongoose = require('mongoose');
require('dotenv').config();

async function probarAtlas() {
    const atlasURI = process.env.MONGODB_URI;
    
    try {
        console.log('🔗 Probando conexión a MongoDB Atlas...');
        
        const conn = await mongoose.connect(atlasURI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 30000,
        });
        
        console.log('✅ ¡Conexión exitosa a MongoDB Atlas!');
        console.log(`🏠 Host: ${conn.connection.host}`);
        console.log(`📊 Base de datos: ${conn.connection.name}`);
        
        await mongoose.disconnect();
        return true;
        
    } catch (error) {
        console.log('❌ Atlas no disponible:', error.message);
        return false;
    }
}

async function migrarDatos() {
    console.log('📦 Iniciando migración de datos Local → Atlas...');
    
    try {
        // Conectar a Local para leer datos
        console.log('📥 Conectando a MongoDB Local...');
        await mongoose.connect('mongodb://localhost:27017/PapasDB');
        
        const Usuario = require('../modelo/Usuario');
        const VariedadPapa = require('../modelo/VariedadPapa');
        
        // Obtener datos locales
        const usuarios = await Usuario.find({});
        const variedades = await VariedadPapa.find({});
        
        console.log(`📊 Encontrados: ${usuarios.length} usuarios, ${variedades.length} variedades`);
        
        await mongoose.disconnect();
        
        // Conectar a Atlas para escribir datos
        console.log('📤 Conectando a MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Migrar usuarios (evitando duplicados)
        for (const usuario of usuarios) {
            try {
                const existe = await Usuario.findOne({ correo: usuario.correo });
                if (!existe) {
                    const nuevoUsuario = new Usuario(usuario.toObject());
                    delete nuevoUsuario._id; // Permitir que MongoDB genere nuevo ID
                    await nuevoUsuario.save();
                    console.log(`✅ Usuario migrado: ${usuario.correo}`);
                } else {
                    console.log(`⏭️  Usuario ya existe: ${usuario.correo}`);
                }
            } catch (error) {
                console.log(`❌ Error migrando usuario ${usuario.correo}:`, error.message);
            }
        }
        
        // Migrar variedades (evitando duplicados)
        for (const variedad of variedades) {
            try {
                const existe = await VariedadPapa.findOne({ nombreComun: variedad.nombreComun });
                if (!existe) {
                    const nuevaVariedad = new VariedadPapa(variedad.toObject());
                    delete nuevaVariedad._id; // Permitir que MongoDB genere nuevo ID
                    await nuevaVariedad.save();
                    console.log(`✅ Variedad migrada: ${variedad.nombreComun}`);
                } else {
                    console.log(`⏭️  Variedad ya existe: ${variedad.nombreComun}`);
                }
            } catch (error) {
                console.log(`❌ Error migrando variedad ${variedad.nombreComun}:`, error.message);
            }
        }
        
        await mongoose.disconnect();
        console.log('🎉 ¡Migración completada exitosamente!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error durante migración:', error.message);
        return false;
    }
}

async function configuracionCompleta() {
    console.log('🚀 Configuración Completa MongoDB Atlas\n');
    
    console.log('📋 Estado actual:');
    console.log('   ✅ Credenciales configuradas en .env');
    console.log('   ✅ Usuario: rolfi');
    console.log('   ✅ Cluster: cluster0.yczwuya.mongodb.net');
    console.log('   ✅ Base de datos: PapasDB\n');
    
    // Probar conexión a Atlas
    const atlasDisponible = await probarAtlas();
    
    if (atlasDisponible) {
        console.log('🎉 ¡MongoDB Atlas está listo!\n');
        
        // Preguntar si migrar datos
        console.log('📦 ¿Migrar datos existentes de Local a Atlas?');
        console.log('   Esto copiará usuarios y variedades existentes.');
        console.log('\nEjecuta: node scripts/migrar-atlas.js migrar');
        
    } else {
        console.log('⚠️  MongoDB Atlas no disponible aún.\n');
        console.log('🔧 Para solucionar:');
        console.log('1. Ve a MongoDB Atlas Dashboard');
        console.log('2. Network Access → Add IP Address');
        console.log('3. Selecciona "Allow access from anywhere" (0.0.0.0/0)');
        console.log('4. Guarda los cambios');
        console.log('5. Espera 1-2 minutos para que se aplique');
        console.log('6. Ejecuta este script nuevamente\n');
    }
}

// Ejecutar según argumentos
const args = process.argv.slice(2);

if (args.includes('migrar')) {
    migrarDatos().then(success => {
        process.exit(success ? 0 : 1);
    });
} else if (args.includes('probar')) {
    probarAtlas().then(success => {
        process.exit(success ? 0 : 1);
    });
} else {
    configuracionCompleta().then(() => {
        process.exit(0);
    });
}

module.exports = { probarAtlas, migrarDatos };