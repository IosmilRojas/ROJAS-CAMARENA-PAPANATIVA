// Script para configurar rápidamente la contraseña de MongoDB Atlas
const fs = require('fs').promises;
const path = require('path');

async function configurarPassword(password) {
    const envPath = path.join(__dirname, '../.env');
    
    try {
        console.log('🔧 Configurando contraseña de MongoDB Atlas...');
        
        // Leer archivo .env actual
        const contenido = await fs.readFile(envPath, 'utf8');
        
        // Reemplazar placeholder con contraseña real
        const nuevoContenido = contenido.replace(
            /MONGODB_URI=mongodb\+srv:\/\/iosmilrojas:.*@/,
            `MONGODB_URI=mongodb+srv://iosmilrojas:${password}@`
        );
        
        // Escribir archivo actualizado
        await fs.writeFile(envPath, nuevoContenido, 'utf8');
        
        console.log('✅ Contraseña configurada exitosamente');
        console.log('🚀 Ahora puedes reiniciar el servidor para usar MongoDB Atlas');
        console.log('\nEjecuta: npm run pmv1');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error configurando contraseña:', error.message);
        return false;
    }
}

// Obtener contraseña de argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('🔑 Configurador de Contraseña MongoDB Atlas\n');
    console.log('Uso: node scripts/config-password.js TU_PASSWORD_REAL\n');
    console.log('Ejemplo: node scripts/config-password.js miPasswordSegura123\n');
    console.log('📋 Pasos:');
    console.log('1. Obtén tu contraseña de MongoDB Atlas');
    console.log('2. Ejecuta este script con tu contraseña');
    console.log('3. Reinicia el servidor con npm run pmv1');
    console.log('\n⚠️  IMPORTANTE: No compartas tu contraseña');
} else {
    const password = args[0];
    configurarPassword(password).then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { configurarPassword };