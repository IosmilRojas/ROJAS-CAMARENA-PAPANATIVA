#!/usr/bin/env node

/**
 * Script para verificar el estado de las fotos de perfil
 * Uso: node scripts/verificar-fotos-perfil.js
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Usuario = require('../models/Usuario');

const profilesDir = path.join(__dirname, '../public/uploads/profiles');

async function verificarFotosPerfil() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          VERIFICACIÓN DE FOTOS DE PERFIL                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Verificar que la carpeta existe
        console.log('📁 Verificando carpeta de perfiles...');
        if (!fs.existsSync(profilesDir)) {
            console.log('❌ Carpeta no existe:', profilesDir);
            fs.mkdirSync(profilesDir, { recursive: true });
            console.log('✅ Carpeta creada:', profilesDir);
        } else {
            console.log('✅ Carpeta existe:', profilesDir);
        }

        // 2. Listar archivos en la carpeta
        console.log('\n📸 Archivos en la carpeta profiles:');
        const files = fs.readdirSync(profilesDir);
        if (files.length === 0) {
            console.log('⚠️ No hay archivos en la carpeta');
        } else {
            files.forEach(file => {
                const filePath = path.join(profilesDir, file);
                const stats = fs.statSync(filePath);
                console.log(`  ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
            });
        }

        // 3. Conectar a MongoDB
        console.log('\n🗄️ Conectando a MongoDB...');
        await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb+srv://iosmil:papanativa2024@papasdb.g0qwj6n.mongodb.net/PapasDB',
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        );
        console.log('✅ Conectado a MongoDB');

        // 4. Verificar usuarios con avatarUrl
        console.log('\n👥 Verificando usuarios con avatarUrl...');
        const usuarios = await Usuario.find({ avatarUrl: { $exists: true, $ne: null } }).select('nombre correo avatarUrl');
        
        if (usuarios.length === 0) {
            console.log('⚠️ No hay usuarios con avatarUrl');
        } else {
            console.log(`✅ Encontrados ${usuarios.length} usuario(s) con avatarUrl:\n`);
            usuarios.forEach((user, idx) => {
                const fileName = user.avatarUrl.split('/').pop();
                const filePath = path.join(profilesDir, fileName);
                const exists = fs.existsSync(filePath);
                
                console.log(`  ${idx + 1}. ${user.nombre} (${user.correo})`);
                console.log(`     Avatar URL: ${user.avatarUrl}`);
                console.log(`     Archivo físico: ${exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);
                
                if (exists) {
                    const stats = fs.statSync(filePath);
                    console.log(`     Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
                }
                console.log('');
            });
        }

        // 5. Generar reporte
        console.log('📊 REPORTE RESUMEN:');
        console.log(`  📁 Carpeta perfiles: ${fs.existsSync(profilesDir) ? '✅' : '❌'}`);
        console.log(`  📸 Archivos en carpeta: ${files.length}`);
        console.log(`  👥 Usuarios con avatar: ${usuarios.length}`);
        
        const usuariosConAvatarValido = usuarios.filter(u => {
            const fileName = u.avatarUrl.split('/').pop();
            const filePath = path.join(profilesDir, fileName);
            return fs.existsSync(filePath);
        });
        console.log(`  ✅ Usuarios con archivo válido: ${usuariosConAvatarValido.length}/${usuarios.length}`);

        // 6. Detectar inconsistencias
        console.log('\n⚠️ INCONSISTENCIAS:');
        let inconsistencias = 0;
        usuarios.forEach(user => {
            const fileName = user.avatarUrl.split('/').pop();
            const filePath = path.join(profilesDir, fileName);
            if (!fs.existsSync(filePath)) {
                console.log(`  ❌ ${user.nombre}: Avatar en BD pero archivo no existe`);
                console.log(`     Path esperado: ${filePath}`);
                inconsistencias++;
            }
        });

        if (inconsistencias === 0) {
            console.log('  ✅ No hay inconsistencias detectadas');
        }

        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║                  VERIFICACIÓN COMPLETADA                       ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verificarFotosPerfil();
