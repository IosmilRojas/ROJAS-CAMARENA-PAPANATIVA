const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Usuario = require('../models/Usuario');

async function migrarAvatarUrl() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/PapasDB', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB');

        // Verificar cuántos usuarios tienen avatarUrl faltante
        const usuariosSinAvatar = await Usuario.countDocuments({ avatarUrl: { $exists: false } });
        console.log(`\n📊 Usuarios sin campo avatarUrl: ${usuariosSinAvatar}`);

        // Contar usuarios con avatarUrl vacío
        const usuariosConAvatarVacio = await Usuario.countDocuments({ 
            $or: [
                { avatarUrl: { $exists: false } },
                { avatarUrl: null },
                { avatarUrl: '' }
            ]
        });
        console.log(`📊 Usuarios con avatarUrl vacío/null/undefined: ${usuariosConAvatarVacio}`);

        // Agregar campo avatarUrl a usuarios que no lo tengan
        const resultado = await Usuario.updateMany(
            { avatarUrl: { $exists: false } },
            { $set: { avatarUrl: null } }
        );

        console.log(`\n✅ Usuarios actualizados (campo agregado): ${resultado.modifiedCount}`);
        console.log(`⏭️  Usuarios no modificados: ${resultado.upsertedCount}`);

        // Mostrar algunos usuarios como ejemplo
        const usuariosActualizados = await Usuario.find({}).limit(5).select('nombre correo avatarUrl');
        console.log('\n📋 Muestra de usuarios actualizado:');
        console.table(usuariosActualizados);

        // Verificar que ahora todos tengan el campo
        const usuariosConCampo = await Usuario.countDocuments({ avatarUrl: { $exists: true } });
        console.log(`\n✅ Total de usuarios con campo avatarUrl: ${usuariosConCampo}`);

        console.log('\n🎉 Migración completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

// Ejecutar migración
migrarAvatarUrl();
