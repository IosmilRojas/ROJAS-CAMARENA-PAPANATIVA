const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Usuario = require('../models/Usuario');

async function verificarYActualizarAvatarUrl() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/PapasDB', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB\n');

        // 1. Obtener todos los usuarios
        const todosLosUsuarios = await Usuario.find({}).select('nombre correo avatarUrl');
        console.log(`📊 Total de usuarios en la BD: ${todosLosUsuarios.length}\n`);

        // 2. Separar por estado del avatarUrl
        const conAvatar = todosLosUsuarios.filter(u => u.avatarUrl && u.avatarUrl.trim() !== '');
        const sinAvatar = todosLosUsuarios.filter(u => !u.avatarUrl || u.avatarUrl.trim() === '');

        console.log(`✅ Usuarios CON avatarUrl: ${conAvatar.length}`);
        console.log(`❌ Usuarios SIN avatarUrl: ${sinAvatar.length}\n`);

        // 3. Mostrar detalles de usuarios con avatar
        if (conAvatar.length > 0) {
            console.log('👤 USUARIOS CON FOTO DE PERFIL:');
            console.log('─'.repeat(80));
            conAvatar.forEach((usuario, idx) => {
                console.log(`${idx + 1}. ${usuario.nombre.padEnd(20)} | ${usuario.correo.padEnd(30)} | ${usuario.avatarUrl}`);
            });
            console.log('─'.repeat(80) + '\n');
        }

        // 4. Mostrar detalles de usuarios sin avatar
        if (sinAvatar.length > 0) {
            console.log('❌ USUARIOS SIN FOTO DE PERFIL:');
            console.log('─'.repeat(80));
            sinAvatar.forEach((usuario, idx) => {
                console.log(`${idx + 1}. ${usuario.nombre.padEnd(20)} | ${usuario.correo}`);
            });
            console.log('─'.repeat(80) + '\n');
        }

        // 5. Verificar que el campo existe en todos
        const usuariosConCampoAvatarUrl = await Usuario.countDocuments({ avatarUrl: { $exists: true } });
        const usuariosSinCampoAvatarUrl = await Usuario.countDocuments({ avatarUrl: { $exists: false } });

        console.log('🔍 VERIFICACIÓN DE CAMPO EN SCHEMA:');
        console.log(`   ✅ Usuarios con campo 'avatarUrl': ${usuariosConCampoAvatarUrl}`);
        console.log(`   ❌ Usuarios sin campo 'avatarUrl': ${usuariosSinCampoAvatarUrl}\n`);

        if (usuariosSinCampoAvatarUrl > 0) {
            console.log('🔧 Agregando campo avatarUrl a usuarios que no lo tienen...');
            const resultado = await Usuario.updateMany(
                { avatarUrl: { $exists: false } },
                { $set: { avatarUrl: null } }
            );
            console.log(`   ✅ Usuarios actualizados: ${resultado.modifiedCount}\n`);
        }

        console.log('✅ ESTADO FINAL: Todos los usuarios tienen el campo avatarUrl\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
        process.exit(0);
    }
}

// Ejecutar
verificarYActualizarAvatarUrl();
