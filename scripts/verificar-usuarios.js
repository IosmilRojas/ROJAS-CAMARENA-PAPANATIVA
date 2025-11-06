const mongoose = require('mongoose');
require('dotenv').config();
const Usuario = require('../modelo/Usuario.js');

async function verificarUsuarios() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB Atlas');
        
        const usuarios = await Usuario.find({}).select('correo contraseña createdAt nombre activo');
        console.log('\n=== USUARIOS EN BASE DE DATOS ===');
        console.log(`Total usuarios: ${usuarios.length}\n`);
        
        usuarios.forEach((usuario, index) => {
            console.log(`${index + 1}. 👤 Nombre: ${usuario.nombre}`);
            console.log(`   📧 Email: ${usuario.correo}`);
            console.log(`   🔐 Hash: ${usuario.contraseña.substring(0, 60)}...`);
            console.log(`   📅 Creado: ${usuario.createdAt}`);
            console.log(`   📏 Longitud: ${usuario.contraseña.length}`);
            console.log(`   ✅ Formato bcrypt: ${usuario.contraseña.startsWith('$2b') ? 'SÍ' : 'NO'}`);
            console.log(`   🟢 Activo: ${usuario.activo ? 'SÍ' : 'NO'}`);
            
            // Verificar si es texto plano (problema común)
            if (!usuario.contraseña.startsWith('$2b') && !usuario.contraseña.startsWith('$2a')) {
                console.log(`   ⚠️  PROBLEMA: Contraseña no está hasheada con bcrypt`);
            }
            
            console.log('');
        });
        
        await mongoose.disconnect();
        console.log('📊 Verificación completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
    }
}

verificarUsuarios();