#!/usr/bin/env node

/**
 * Script para probar la descarga de clasificaciones
 * Simula lo que hace el botón "Exportar"
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = 'localhost';
const PORT = 3000;

// Crear carpeta de descargas si no existe
const descargasDir = path.join(__dirname, 'descargas_test');
if (!fs.existsSync(descargasDir)) {
    fs.mkdirSync(descargasDir);
}

console.log('🧪 PRUEBA DE EXPORTACIÓN DE CLASIFICACIONES\n');
console.log('========================================\n');

// Hacer petición HTTP
const options = {
    hostname: HOST,
    port: PORT,
    path: '/reportes/api/exportar?formato=json',
    method: 'GET',
    headers: {
        'Accept': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`✅ Respuesta recibida`);
    console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    console.log(`   Content-Length: ${res.headers['content-length']} bytes\n`);
    
    if (res.statusCode === 401) {
        console.error('❌ Error: No autenticado');
        console.error('   Asegúrate de que estés logueado en la aplicación');
        return;
    }
    
    if (res.statusCode !== 200) {
        console.error(`❌ Error HTTP ${res.statusCode}`);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.error('   Respuesta:', data);
        });
        return;
    }
    
    // Guardar archivo
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `clasificaciones_${timestamp}.json`;
    const filepath = path.join(descargasDir, filename);
    
    const file = fs.createWriteStream(filepath);
    let totalBytes = 0;
    
    res.on('data', (chunk) => {
        totalBytes += chunk.length;
        file.write(chunk);
    });
    
    res.on('end', () => {
        file.end();
        console.log(`📁 Archivo guardado: ${filename}`);
        console.log(`   Tamaño: ${(totalBytes / 1024).toFixed(2)} KB`);
        console.log(`   Ruta: ${filepath}\n`);
        
        // Leer y mostrar resumen
        const contenido = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        console.log('📊 RESUMEN DEL REPORTE:');
        console.log(`   Total clasificaciones: ${contenido.metadatos.totalRegistros}`);
        console.log(`   Usuario: ${contenido.metadatos.usuarioSolicitante}`);
        console.log(`   Fecha generación: ${contenido.metadatos.fechaGeneracion}`);
        console.log(`   Filtros: ${JSON.stringify(contenido.metadatos.filtrosAplicados)}\n`);
        
        if (contenido.clasificaciones && contenido.clasificaciones.length > 0) {
            console.log('✅ PRIMERAS 3 CLASIFICACIONES:');
            contenido.clasificaciones.slice(0, 3).forEach((cls, i) => {
                console.log(`\n   ${i + 1}. ${cls.variedad}`);
                console.log(`      Fecha: ${cls.fecha}`);
                console.log(`      Usuario: ${cls.usuario}`);
                console.log(`      Confianza: ${cls.confianzaPorcentaje}`);
                console.log(`      Estado: ${cls.estado}`);
            });
        } else {
            console.log('⚠️  No hay clasificaciones para mostrar');
        }
        
        console.log('\n========================================');
        console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE');
        console.log('========================================\n');
    });
});

req.on('error', (error) => {
    console.error('❌ Error de conexión:', error.message);
    console.error('\nAsegúrate que:');
    console.error('1. La aplicación está corriendo en http://localhost:3000');
    console.error('2. Estás autenticado');
    console.error('3. Tienes permiso para ver clasificaciones');
});

console.log(`📡 Conectando a http://${HOST}:${PORT}/reportes/api/exportar...\n`);
req.end();
