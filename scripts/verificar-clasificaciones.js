const mongoose = require('mongoose');
require('dotenv').config();
const Clasificacion = require('../modelo/Clasificacion');
const Usuario = require('../modelo/Usuario');
const VariedadPapa = require('../modelo/VariedadPapa');

async function verificarClasificaciones() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB Atlas');
        
        const clasificaciones = await Clasificacion.find({})
            .populate('idUsuario', 'nombre correo')
            .populate('idVariedad', 'nombreComun nombreCientifico descripcion')
            .sort({ fechaClasificacion: -1 })
            .limit(10);
        
        console.log('\n=== CLASIFICACIONES EN BASE DE DATOS ===');
        console.log(`Total encontradas (últimas 10): ${clasificaciones.length}\n`);
        
        if (clasificaciones.length === 0) {
            console.log('❌ No se encontraron clasificaciones en la base de datos');
        } else {
            clasificaciones.forEach((cls, index) => {
                console.log(`${index + 1}. 📊 Clasificación ID: ${cls.idClasificacion}`);
                console.log(`   👤 Usuario: ${cls.idUsuario ? cls.idUsuario.nombre : 'N/A'} (${cls.idUsuario ? cls.idUsuario.correo : 'N/A'})`);
                console.log(`   🥔 Variedad: ${cls.idVariedad ? cls.idVariedad.nombreComun : 'N/A'}`);
                console.log(`   📈 Confianza: ${(cls.confianza * 100).toFixed(1)}%`);
                console.log(`   ✅ Condición: ${cls.condicion || 'NO DEFINIDA'}`);
                console.log(`   🕐 Fecha: ${cls.fechaClasificacion}`);
                console.log(`   📝 Estado: ${cls.estado}`);
                console.log('');
            });
        }
        
        // Estadísticas por condición
        console.log('\n=== ESTADÍSTICAS POR CONDICIÓN ===');
        const estadisticasCondicion = await Clasificacion.aggregate([
            {
                $group: {
                    _id: '$condicion',
                    count: { $sum: 1 },
                    avgConfianza: { $avg: '$confianza' }
                }
            }
        ]);
        
        estadisticasCondicion.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} clasificaciones (Confianza promedio: ${(stat.avgConfianza * 100).toFixed(1)}%)`);
        });
        
        // Estadísticas por usuario
        console.log('\n=== ESTADÍSTICAS POR USUARIO ===');
        const estadisticasUsuario = await Clasificacion.aggregate([
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'idUsuario',
                    foreignField: '_id',
                    as: 'usuario'
                }
            },
            { $unwind: '$usuario' },
            {
                $group: {
                    _id: '$usuario.nombre',
                    count: { $sum: 1 },
                    email: { $first: '$usuario.correo' }
                }
            }
        ]);
        
        estadisticasUsuario.forEach(stat => {
            console.log(`${stat._id} (${stat.email}): ${stat.count} clasificaciones`);
        });
        
        await mongoose.disconnect();
        console.log('\n📊 Verificación completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
    }
}

verificarClasificaciones();