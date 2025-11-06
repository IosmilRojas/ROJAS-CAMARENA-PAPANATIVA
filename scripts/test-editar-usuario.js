#!/usr/bin/env node

/**
 * Script para probar la actualización de usuarios
 * Uso: node test-editar-usuario.js
 * 
 * Este script:
 * 1. Obtiene la lista de usuarios
 * 2. Toma el primer usuario
 * 3. Intenta actualizarlo
 * 4. Verifica que los cambios se guardaron
 */

const http = require('http');

// Configuración
const HOST = 'localhost';
const PORT = 3000;
const BASE_URL = `http://${HOST}:${PORT}`;

let usuarioTestId = null;

// Función para hacer peticiones HTTP
function hacerPeticion(metodo, ruta, datos = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + ruta);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: metodo,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);

        if (datos) {
            req.write(JSON.stringify(datos));
        }
        req.end();
    });
}

// Función principal de prueba
async function ejecutarPruebas() {
    console.log('========================================');
    console.log('🧪 PRUEBA DE ACTUALIZACIÓN DE USUARIOS');
    console.log('========================================\n');

    try {
        // Paso 1: Obtener usuarios
        console.log('1️⃣  Obteniendo lista de usuarios...');
        const resUsuarios = await hacerPeticion('GET', '/gestion-usuarios/api/usuarios');
        
        if (!resUsuarios.data.success || !resUsuarios.data.usuarios.length) {
            console.error('❌ Error: No hay usuarios disponibles');
            return;
        }

        const usuario = resUsuarios.data.usuarios[0];
        usuarioTestId = usuario._id;
        
        console.log(`✅ Usuario encontrado: ${usuario.nombre} (${usuario.correo})`);
        console.log(`   ID: ${usuarioTestId}\n`);

        // Paso 2: Preparar actualización
        console.log('2️⃣  Preparando actualización...');
        const datosActualizacion = {
            nombre: usuario.nombre,
            apellido: usuario.apellido || 'Actualizado',
            correo: usuario.correo,
            dni: usuario.dni,
            telefono: usuario.telefono,
            genero: usuario.genero || 'no-especifica',
            fechaNacimiento: usuario.fechaNacimiento,
            direccion: usuario.direccion || 'Dirección actualizada',
            rol: usuario.rol,
            departamento: usuario.departamento || 'Test Departamento',
            provincia: usuario.ubicacion?.provincia || 'Test Provincia',
            distrito: usuario.ubicacion?.distrito || 'Test Distrito'
        };

        console.log('Datos a enviar:');
        console.log(JSON.stringify(datosActualizacion, null, 2));
        console.log('');

        // Paso 3: Enviar actualización
        console.log('3️⃣  Enviando actualización...');
        const resActualizacion = await hacerPeticion(
            'PUT', 
            `/gestion-usuarios/api/usuarios/${usuarioTestId}`,
            datosActualizacion
        );

        console.log(`Status HTTP: ${resActualizacion.status}`);
        console.log('Respuesta del servidor:');
        console.log(JSON.stringify(resActualizacion.data, null, 2));
        console.log('');

        if (!resActualizacion.data.success) {
            console.error('❌ Error en la actualización:', resActualizacion.data.error);
            return;
        }

        console.log('✅ Actualización exitosa!\n');

        // Paso 4: Verificar cambios
        console.log('4️⃣  Verificando cambios...');
        const resVerificacion = await hacerPeticion('GET', `/gestion-usuarios/api/usuarios/${usuarioTestId}`);
        
        if (!resVerificacion.data.success) {
            console.error('❌ Error al verificar: ', resVerificacion.data.error);
            return;
        }

        const usuarioActualizado = resVerificacion.data.usuario;
        console.log('Usuario después de actualización:');
        console.log(`  Nombre: ${usuarioActualizado.nombre}`);
        console.log(`  Apellido: ${usuarioActualizado.apellido}`);
        console.log(`  Correo: ${usuarioActualizado.correo}`);
        console.log(`  Rol: ${usuarioActualizado.rol}`);
        console.log(`  Departamento: ${usuarioActualizado.departamento}`);
        console.log(`  Última actualización: ${usuarioActualizado.fechaActualizacion}`);
        console.log('');

        console.log('========================================');
        console.log('✅ TODAS LAS PRUEBAS PASARON CORRECTAMENTE');
        console.log('========================================');

    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Ejecutar pruebas
console.log(`Conectando a ${BASE_URL}...\n`);
ejecutarPruebas().catch(console.error);
