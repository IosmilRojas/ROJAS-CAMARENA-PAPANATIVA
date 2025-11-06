/**
 * Contador simple de registros
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://rolfi:321@cluster0.yczwuya.mongodb.net/PapasDB';

async function contar() {
    try {
        await mongoose.connect(MONGODB_URI);
        
        const db = mongoose.connection.db;
        
        const clasificaciones = await db.collection('clasificaciones').countDocuments();
        const imagenes = await db.collection('imagenes').countDocuments();
        
        console.log(`📊 Estado de la base de datos (${new Date().toLocaleString()}):`);
        console.log(`   📋 Clasificaciones: ${clasificaciones}`);
        console.log(`   🖼️ Imágenes: ${imagenes}`);
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

contar();