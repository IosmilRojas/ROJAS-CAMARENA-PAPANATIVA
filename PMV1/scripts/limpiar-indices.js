// Script para limpiar índices problemáticos en MongoDB
const mongoose = require('mongoose');
const connectDB = require('../basedatos/db');

async function limpiarIndices() {
    try {
        console.log('🔧 Conectando a MongoDB...');
        await connectDB();
        
        const db = mongoose.connection.db;
        const usuariosCollection = db.collection('usuarios');
        
        console.log('📋 Obteniendo índices existentes...');
        const indices = await usuariosCollection.indexes();
        
        console.log('Índices encontrados:');
        indices.forEach((index, i) => {
            console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
        });
        
        // Verificar si existe el índice problemático 'email_1'
        const indiceProblematico = indices.find(index => index.name === 'email_1');
        
        if (indiceProblematico) {
            console.log('❌ Encontrado índice problemático: email_1');
            console.log('🗑️  Eliminando índice problemático...');
            
            await usuariosCollection.dropIndex('email_1');
            console.log('✅ Índice email_1 eliminado exitosamente');
        } else {
            console.log('✅ No se encontró el índice problemático email_1');
        }
        
        // Verificar y crear índice correcto para 'correo' si no existe
        const indiceCorreo = indices.find(index => 
            index.name === 'correo_1' || 
            (index.key && index.key.correo)
        );
        
        if (!indiceCorreo) {
            console.log('🔧 Creando índice correcto para campo correo...');
            await usuariosCollection.createIndex({ correo: 1 }, { unique: true });
            console.log('✅ Índice correo_1 creado exitosamente');
        } else {
            console.log('✅ Índice para correo ya existe');
        }
        
        console.log('\n📊 Resumen final de índices:');
        const indicesFinales = await usuariosCollection.indexes();
        indicesFinales.forEach((index, i) => {
            console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
        });
        
        console.log('\n🎉 Limpieza de índices completada exitosamente!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error durante la limpieza de índices:', error);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    limpiarIndices();
}

module.exports = { limpiarIndices };