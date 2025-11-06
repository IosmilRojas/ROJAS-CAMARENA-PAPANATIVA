/**
 * Test directo de la API de clasificación
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🧪 Test de API de Clasificación');
        console.log('==============================');
        
        // Primero verificar el estado del servidor
        console.log('1️⃣ Verificando estado del servidor...');
        const serverResponse = await fetch('http://localhost:3000');
        console.log(`   Estado: ${serverResponse.status} ${serverResponse.statusText}`);
        
        // Intentar acceder a clasificar sin login (debería redirigir)
        console.log('\n2️⃣ Probando acceso sin login...');
        const noAuthResponse = await fetch('http://localhost:3000/clasificacion');
        console.log(`   Estado: ${noAuthResponse.status} ${noAuthResponse.statusText}`);
        
        // Para una prueba completa, necesitaríamos simular login
        console.log('\n💡 Para probar completamente:');
        console.log('   1. Ve a http://localhost:3000 en el navegador');
        console.log('   2. Haz login con tu usuario');
        console.log('   3. Ve a "Clasificar" y sube una imagen');
        console.log('   4. Observa los logs del servidor para ver si se procesa');
        console.log('\n📊 Estado actual de BD antes de tu prueba:');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();