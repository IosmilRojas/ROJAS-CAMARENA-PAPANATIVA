const mongoose = require('mongoose');
require('dotenv').config();
const Clasificacion = require('../modelo/Clasificacion');
const Usuario = require('../modelo/Usuario');
const VariedadPapa = require('../modelo/VariedadPapa');
const Imagen = require('../modelo/Imagen');

async function crearClasificacionesPrueba() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB Atlas');
        
        // Buscar un usuario existente
        const usuario = await Usuario.findOne({ correo: 'admin@papaclick.com' });
        if (!usuario) {
            console.log('❌ Usuario admin no encontrado');
            return;
        }
        
        // Buscar variedades existentes
        const variedades = await VariedadPapa.find({});
        if (variedades.length === 0) {
            console.log('❌ No se encontraron variedades');
            return;
        }
        
        console.log(`👤 Usuario encontrado: ${usuario.nombre}`);
        console.log(`🥔 Variedades encontradas: ${variedades.length}`);
        
        // Crear clasificaciones de prueba
        const clasificacionesPrueba = [
            {
                variedad: 'amarilla',
                confianza: 0.92,
                condicion: 'apto'
            },
            {
                variedad: 'huayro', 
                confianza: 0.65,
                condicion: 'no apto'
            },
            {
                variedad: 'peruanita',
                confianza: 0.88,
                condicion: 'apto'
            },
            {
                variedad: 'amarilla',
                confianza: 0.45,
                condicion: 'no apto'
            }
        ];
        
        for (let i = 0; i < clasificacionesPrueba.length; i++) {
            const prueba = clasificacionesPrueba[i];
            
            // Encontrar la variedad
            const variedad = variedades.find(v => 
                v.nombreComun && v.nombreComun.toLowerCase().includes(prueba.variedad.toLowerCase())
            );
            
            if (!variedad) {
                console.log(`⚠️ Variedad ${prueba.variedad} no encontrada`);
                continue;
            }
            
            // Crear imagen simulada
            const nuevaImagen = new Imagen({
                nombreOriginal: `prueba_${prueba.variedad}_${i + 1}.jpg`,
                urlImagen: `/uploads/prueba_${Date.now()}_${i}.jpg`,
                tamaño: 1024000,
                formato: 'jpg',
                usuarioSubida: usuario._id,
                dimensiones: {
                    ancho: 800,
                    alto: 600
                },
                metadatos: {
                    calidad: 'alta',
                    dispositivo: 'simulado',
                    ubicacion: 'prueba'
                },
                procesada: true
            });
            
            await nuevaImagen.save();
            
            // Crear clasificación
            const nuevaClasificacion = new Clasificacion({
                idClasificacion: `CLS_PRUEBA_${Date.now()}_${i}`,
                idUsuario: usuario._id,
                idImagen: nuevaImagen._id,
                idVariedad: variedad._id,
                confianza: prueba.confianza,
                condicion: prueba.condicion,
                estado: 'procesada',
                tiempoProcesamientoMs: Math.floor(Math.random() * 2000) + 500,
                metadatosIA: {
                    modeloVersion: 'v1.0-simulado',
                    algoritmo: 'TensorFlow.js',
                    parametros: { simulado: true }
                },
                fechaClasificacion: new Date()
            });
            
            await nuevaClasificacion.save();
            
            console.log(`✅ Clasificación creada: ${variedad.nombreComun} - ${prueba.confianza * 100}% (${prueba.condicion})`);
        }
        
        console.log('\n🎉 Clasificaciones de prueba creadas exitosamente');
        
        // Verificar que se crearon
        const totalClasificaciones = await Clasificacion.countDocuments({ idUsuario: usuario._id });
        console.log(`📊 Total clasificaciones del usuario: ${totalClasificaciones}`);
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
    }
}

crearClasificacionesPrueba();