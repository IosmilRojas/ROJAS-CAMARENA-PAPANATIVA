const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Usuario = require('../models/Usuario');

// Obtener parámetros de línea de comandos
const args = process.argv.slice(2);
const correo = args[0];
const avatarUrl = args[1];

async function actualizarAvatarUrl() {
    try {
        if (!correo || !avatarUrl) {
            console.log('\n❌ USO: node scripts/actualizar-avatar.js <correo> <avatarUrl>');
            console.log('\n📝 EJEMPLO:');
            console.log(`   node scripts/actualizar-avatar.js admin@papaclick.com "/uploads/profiles/profile-1762318459556-864610897.png"\n`);
            process.exit(1);
        }

        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/PapasDB', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB\n');

        // Buscar usuario por correo
        const usuario = await Usuario.findOne({ correo });

        if (!usuario) {
            console.log(`❌ Error: No se encontró usuario con correo: ${correo}\n`);
            process.exit(1);
        }

        console.log(`👤 Usuario encontrado: ${usuario.nombre}`);
        console.log(`📧 Correo: ${usuario.correo}`);
        console.log(`🖼️  Avatar anterior: ${usuario.avatarUrl || '(sin foto)'}\n`);

        // Actualizar avatarUrl
        usuario.avatarUrl = avatarUrl;
        await usuario.save();

        console.log(`✅ Avatar actualizado exitosamente!`);
        console.log(`🖼️  Nuevo avatar: ${usuario.avatarUrl}\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Ejecutar
actualizarAvatarUrl();
