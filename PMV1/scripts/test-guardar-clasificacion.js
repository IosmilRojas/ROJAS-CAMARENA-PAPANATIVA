const mongoose = require('mongoose');
require('dotenv').config();
const Clasificacion = require('../modelo/Clasificacion');
const Usuario = require('../modelo/Usuario');
const VariedadPapa = require('../modelo/VariedadPapa');
const Imagen = require('../modelo/Imagen');

async function testGuardarClasificacion() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB Atlas');
        
        // Verificar usuario
        const usuario = await Usuario.findOne({ correo: 'admin@papaclick.com' });
        if (!usuario) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        // Verificar variedades
        const variedad = await VariedadPapa.findOne({ nombreComun: 'Amarilla' });
        if (!variedad) {
            console.log('❌ Variedad no encontrada');
            console.log('Variedades disponibles:');
            const todasVariedades = await VariedadPapa.find({});
            todasVariedades.forEach(v => {
                console.log(`- ${v.nombreComun} (activa: ${v.activa})`);
            });
            return;
        }
        
        console.log(`👤 Usuario: ${usuario.nombre} (${usuario._id})`);
        console.log(`🥔 Variedad: ${variedad.nombreComun} (${variedad._id})`);
        
        // Crear imagen de prueba
        const nuevaImagen = new Imagen({
            nombreOriginal: 'test_clasificacion.jpg',
            urlImagen: '/uploads/test_clasificacion.jpg',
            tamaño: 1024000,
            formato: 'jpg',
            usuarioSubida: usuario._id,
            dimensiones: { ancho: 800, alto: 600 },
            metadatos: { calidad: 'test', dispositivo: 'simulado' },
            procesada: true
        });
        
        await nuevaImagen.save();
        console.log(`📷 Imagen creada: ${nuevaImagen._id}`);
        
        // Crear clasificación de prueba
        const clasificacionTest = new Clasificacion({
            idClasificacion: `TEST_${Date.now()}`,
            idUsuario: usuario._id,
            idImagen: nuevaImagen._id,
            idVariedad: variedad._id,
            confianza: 0.85,
            condicion: 'apto',
            estado: 'procesada',
            tiempoProcesamientoMs: 1200,
            metadatosIA: {
                modeloVersion: 'v1.0-test',
                algoritmo: 'TensorFlow.js'
            }
        });
        
        const clasificacionGuardada = await clasificacionTest.save();
        console.log(`✅ Clasificación guardada: ${clasificacionGuardada.idClasificacion}`);
        
        // Verificar que se guardó correctamente
        const verificacion = await Clasificacion.findById(clasificacionGuardada._id)
            .populate('idUsuario', 'nombre correo')
            .populate('idVariedad', 'nombreComun')
            .populate('idImagen', 'nombreOriginal');
            
        console.log('\n📊 VERIFICACIÓN DE DATOS GUARDADOS:');
        console.log(`ID: ${verificacion._id}`);
        console.log(`Usuario: ${verificacion.idUsuario.nombre}`);
        console.log(`Variedad: ${verificacion.idVariedad.nombreComun}`);
        console.log(`Confianza: ${(verificacion.confianza * 100).toFixed(1)}%`);
        console.log(`Condición: ${verificacion.condicion}`);
        console.log(`Fecha: ${verificacion.fechaClasificacion}`);
        
        // Contar total de clasificaciones
        const total = await Clasificacion.countDocuments();
        console.log(`\n📈 Total clasificaciones en DB: ${total}`);
        
        await mongoose.disconnect();
        console.log('\n🎉 Test completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error en test:', error);
        await mongoose.disconnect();
    }
}

testGuardarClasificacion();