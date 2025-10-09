#!/usr/bin/env node

// Script para ayudar con la configuración de MongoDB Atlas
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🥔 CONFIGURADOR DE MONGODB ATLAS - PMV1');
console.log('═══════════════════════════════════════════');
console.log('');

async function configurarAtlas() {
    console.log('📋 Pasos para obtener tu URI de MongoDB Atlas:');
    console.log('');
    console.log('1️⃣  Ve a: https://cloud.mongodb.com');
    console.log('2️⃣  Inicia sesión o crea una cuenta');
    console.log('3️⃣  Crea un cluster gratuito si no tienes uno');
    console.log('4️⃣  Haz clic en "Connect" en tu cluster');
    console.log('5️⃣  Selecciona "Drivers"');
    console.log('6️⃣  Copia la cadena de conexión');
    console.log('');
    
    return new Promise((resolve) => {
        rl.question('¿Ya tienes tu URI de MongoDB Atlas? (s/n): ', (respuesta) => {
            if (respuesta.toLowerCase() === 's' || respuesta.toLowerCase() === 'si') {
                pedirURI(resolve);
            } else {
                console.log('');
                console.log('🌐 Abrir MongoDB Atlas...');
                console.log('Presiona ENTER después de obtener tu URI');
                
                // Intentar abrir el navegador
                try {
                    const { exec } = require('child_process');
                    exec('start https://cloud.mongodb.com', (error) => {
                        if (error) {
                            console.log('Ve manualmente a: https://cloud.mongodb.com');
                        }
                    });
                } catch (e) {
                    console.log('Ve manualmente a: https://cloud.mongodb.com');
                }
                
                rl.question('Presiona ENTER para continuar...', () => {
                    pedirURI(resolve);
                });
            }
        });
    });
}

function pedirURI(resolve) {
    console.log('');
    console.log('📝 Ingresa tu URI de MongoDB Atlas:');
    console.log('Ejemplo: mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/PapasDB');
    console.log('');
    
    rl.question('URI: ', (uri) => {
        if (validarURI(uri)) {
            actualizarEnv(uri);
            resolve(uri);
        } else {
            console.log('❌ URI inválida. Intenta nuevamente.');
            pedirURI(resolve);
        }
    });
}

function validarURI(uri) {
    // Validaciones básicas
    if (!uri || uri.trim() === '') {
        console.log('❌ URI no puede estar vacía');
        return false;
    }
    
    if (!uri.startsWith('mongodb+srv://')) {
        console.log('❌ URI debe comenzar con "mongodb+srv://"');
        return false;
    }
    
    if (uri.includes('username:password')) {
        console.log('❌ Reemplaza "username:password" con tus credenciales reales');
        return false;
    }
    
    if (uri.includes('xxxxx')) {
        console.log('❌ Reemplaza "xxxxx" con tu cluster real');
        return false;
    }
    
    return true;
}

function actualizarEnv(uri) {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Reemplazar la línea MONGODB_URI
        const lines = envContent.split('\n');
        const newLines = lines.map(line => {
            if (line.startsWith('MONGODB_URI=')) {
                return `MONGODB_URI=${uri}`;
            }
            return line;
        });
        
        fs.writeFileSync(envPath, newLines.join('\n'));
        
        console.log('');
        console.log('✅ Archivo .env actualizado exitosamente!');
        console.log('🚀 Ahora puedes ejecutar: npm run pmv1');
        
    } catch (error) {
        console.log('');
        console.log('⚠️  No se pudo actualizar .env automáticamente');
        console.log('📝 Actualiza manualmente la línea:');
        console.log(`MONGODB_URI=${uri}`);
    }
}

// Ejecutar configurador
configurarAtlas().then((uri) => {
    console.log('');
    console.log('🎉 Configuración completada!');
    console.log('');
    console.log('🔧 Próximos pasos:');
    console.log('1. Ejecuta: npm run pmv1');
    console.log('2. Ve a: http://localhost:3000');
    console.log('3. ¡Disfruta tu sistema de clasificación de papas!');
    console.log('');
    
    rl.close();
}).catch((error) => {
    console.error('❌ Error:', error.message);
    rl.close();
});