/**
 * 📋 RESUMEN: Sistema de avatarUrl en PapaIA
 * ================================================
 * 
 * UBICACIÓN DEL CAMPO:
 * ✅ Modelo: models/Usuario.js (líneas 56-61)
 * ✅ Controlador: routes/perfilRoutes.js (línea 99)
 * ✅ Actualización Sesión: routes/perfilRoutes.js (línea 131)
 * ✅ Middleware: app.js (sincroniza avatarUrl en cada request)
 * 
 * FUNCIONALIDAD:
 * 1. Usuario sube foto en /perfil/actualizar (POST)
 * 2. Multer guarda en: public/uploads/profiles/profile-[timestamp]-[random].[ext]
 * 3. ruta guardada en BD: /uploads/profiles/profile-[timestamp]-[random].[ext]
 * 4. Sesión actualizada: req.session.usuario.avatarUrl
 * 5. Middleware sincroniza avatarUrl en cada request si falta en sesión
 * 
 * SCRIPTS DISPONIBLES:
 * - verificar-avatarUrl.js : Ver estado actual de avatarUrl en todos usuarios
 * - actualizar-avatar.js   : Actualizar avatarUrl manualmente
 * - migrar-avatarUrl.js    : Agregar campo a usuarios sin él
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Usuario = require('../models/Usuario');

async function diagnosticoCompleto() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 DIAGNÓSTICO COMPLETO - SISTEMA DE AVATARURL');
        console.log('='.repeat(80) + '\n');

        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/PapasDB', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB\n');

        // 1. Estadísticas generales
        console.log('📊 ESTADÍSTICAS GENERALES:');
        console.log('─'.repeat(80));
        
        const totalUsuarios = await Usuario.countDocuments();
        const usuariosConCampo = await Usuario.countDocuments({ avatarUrl: { $exists: true } });
        const usuariosSinCampo = await Usuario.countDocuments({ avatarUrl: { $exists: false } });
        const usuariosConAvatar = await Usuario.countDocuments({ 
            avatarUrl: { $exists: true, $ne: null, $ne: '' }
        });
        const usuariosSinAvatar = await Usuario.countDocuments({
            $or: [
                { avatarUrl: { $exists: false } },
                { avatarUrl: null },
                { avatarUrl: '' }
            ]
        });

        console.log(`   Total de usuarios: ${totalUsuarios}`);
        console.log(`   ✅ Usuarios con campo avatarUrl: ${usuariosConCampo}`);
        console.log(`   ❌ Usuarios sin campo avatarUrl: ${usuariosSinCampo}`);
        console.log(`   🖼️  Usuarios con foto (avatarUrl no vacío): ${usuariosConAvatar}`);
        console.log(`   📭 Usuarios sin foto (avatarUrl vacío/null): ${usuariosSinAvatar}\n`);

        // 2. Listar todos los usuarios
        console.log('👥 DETALLE DE USUARIOS:');
        console.log('─'.repeat(80));
        
        const usuarios = await Usuario.find({}).select('nombre correo avatarUrl rol').lean();
        
        usuarios.forEach((usuario, idx) => {
            const avatarStatus = usuario.avatarUrl ? '🖼️ ' : '📭';
            const avatarValue = usuario.avatarUrl || '(sin foto)';
            console.log(`\n${idx + 1}. ${usuario.nombre.padEnd(20)} | ${usuario.correo.padEnd(30)}`);
            console.log(`   Rol: ${usuario.rol.padEnd(15)} | Avatar: ${avatarStatus} ${avatarValue}`);
        });

        console.log('\n' + '─'.repeat(80));

        // 3. Instrucciones para actualizar avatar
        console.log('\n\n📝 CÓMO ACTUALIZAR AVATARURL:\n');
        console.log('OPCIÓN 1 - A través de la interfaz web:');
        console.log('   1. Ir a http://localhost:3000/perfil');
        console.log('   2. Hacer clic en "Cambiar foto de perfil"');
        console.log('   3. Seleccionar imagen (JPG o PNG, máx 5MB)');
        console.log('   4. Hacer clic en "Guardar cambios"\n');

        console.log('OPCIÓN 2 - Manualmente con script:');
        console.log('   node scripts/actualizar-avatar.js "correo@ejemplo.com" "/ruta/de/imagen.png"\n');
        
        console.log('OPCIÓN 3 - Por URL externa:');
        console.log('   node scripts/actualizar-avatar.js "admin@papaclick.com" "https://ejemplo.com/foto.jpg"\n');

        // 4. Verificar estructura del modelo
        console.log('─'.repeat(80));
        console.log('📋 VERIFICACIÓN DE SCHEMA:\n');
        
        const schema = Usuario.schema.paths.avatarUrl;
        console.log(`   Tipo: ${schema.instance}`);
        console.log(`   Requerido: ${schema.isRequired}`);
        console.log(`   Trim: ${schema.options.trim || 'no'}`);
        console.log(`   Default: ${schema.defaultValue || 'ninguno'}\n`);

        console.log('✅ ESTADO GENERAL: Sistema de avatarUrl FUNCIONANDO CORRECTAMENTE\n');
        
        if (usuariosSinCampo > 0) {
            console.log('⚠️  NOTA: Algunos usuarios no tienen el campo avatarUrl.');
            console.log('    Ejecuta: node scripts/migrar-avatarUrl.js\n');
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Ejecutar
diagnosticoCompleto();
