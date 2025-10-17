// Script de inicialización - Variedades de Papa
const mongoose = require('mongoose');
const VariedadPapa = require('../modelo/VariedadPapa');
const connectDB = require('../basedatos/db');

// Datos de las variedades nativas del Perú
const variedadesIniciales = [
    {
        nombreCientifico: 'Solanum tuberosum var. amarilla',
        nombreComun: 'amarilla',
        descripcion: 'Papa criolla tradicional del Perú, caracterizada por su color amarillo intenso y sabor dulce. Es una de las variedades más consumidas en la gastronomía peruana.',
        origen: {
            pais: 'Perú',
            region: 'Sierra Central y Norte',
            altitud: '2800-4000 msnm'
        },
        caracteristicas: {
            color: 'Amarillo intenso',
            forma: 'Ovalada a redonda',
            tamaño: 'Mediano (5-8 cm)',
            textura: 'Harinosa y cremosa'
        },
        usosCulinarios: [
            'Papa rellena',
            'Puré de papas',
            'Papas a la huancaína',
            'Causa limeña',
            'Guisos tradicionales'
        ],
        valorNutricional: {
            carbohidratos: 20.1,
            proteinas: 2.0,
            vitaminas: ['Vitamina C', 'Vitamina B6', 'Potasio', 'Hierro']
        },
        temporadaCultivo: {
            siembra: 'Octubre - Diciembre',
            cosecha: 'Abril - Junio'
        },
        activa: true
    },
    {
        nombreCientifico: 'Solanum tuberosum var. huayro',
        nombreComun: 'huayro',
        descripcion: 'Variedad andina resistente y de gran valor nutritivo. Conocida por su piel rojiza y pulpa amarilla, es muy apreciada por su sabor característico y versatilidad culinaria.',
        origen: {
            pais: 'Perú',
            region: 'Cusco, Apurímac, Huancavelica',
            altitud: '3200-4200 msnm'
        },
        caracteristicas: {
            color: 'Piel rojiza, pulpa amarilla',
            forma: 'Alargada u ovalada',
            tamaño: 'Mediano a grande (6-10 cm)',
            textura: 'Semi-harinosa, consistente'
        },
        usosCulinarios: [
            'Papa sancochada',
            'Papas rellenas',
            'Estofados andinos',
            'Chuño (papa deshidratada)',
            'Sopas tradicionales'
        ],
        valorNutricional: {
            carbohidratos: 18.5,
            proteinas: 2.3,
            vitaminas: ['Vitamina C', 'Antioxidantes', 'Hierro', 'Zinc']
        },
        temporadaCultivo: {
            siembra: 'Septiembre - Noviembre',
            cosecha: 'Marzo - Mayo'
        },
        activa: true
    },
    {
        nombreCientifico: 'Solanum tuberosum var. peruanita',
        nombreComun: 'peruanita',
        descripcion: 'Papa nativa pequeña de gran importancia cultural y gastronómica en el Perú. Se caracteriza por su tamaño compacto y su sabor intenso, ideal para preparaciones tradicionales.',
        origen: {
            pais: 'Perú',
            region: 'Junín, Huánuco, Pasco',
            altitud: '3000-3800 msnm'
        },
        caracteristicas: {
            color: 'Piel morada o rojiza, pulpa amarilla',
            forma: 'Redonda pequeña',
            tamaño: 'Pequeño (3-5 cm)',
            textura: 'Compacta y sabrosa'
        },
        usosCulinarios: [
            'Papa runa (con cáscara)',
            'Anticuchos de papa',
            'Ensaladas andinas',
            'Guarniciones tradicionales',
            'Papas nativas al horno'
        ],
        valorNutricional: {
            carbohidratos: 19.8,
            proteinas: 2.1,
            vitaminas: ['Vitamina C', 'Antocianinas', 'Potasio', 'Magnesio']
        },
        temporadaCultivo: {
            siembra: 'Octubre - Diciembre',
            cosecha: 'Abril - Junio'
        },
        activa: true
    }
];

async function inicializarVariedades() {
    try {
        console.log('🌱 Iniciando inserción de variedades de papa...');
        
        // Conectar a la base de datos
        await connectDB();
        
        // Verificar si ya existen variedades
        const variedadesExistentes = await VariedadPapa.countDocuments();
        
        if (variedadesExistentes > 0) {
            console.log(`⚠️  Ya existen ${variedadesExistentes} variedades en la base de datos.`);
            console.log('🔄 Actualizando variedades existentes...');
            
            // Actualizar o crear cada variedad
            for (const variedad of variedadesIniciales) {
                await VariedadPapa.findOneAndUpdate(
                    { nombreComun: variedad.nombreComun },
                    variedad,
                    { upsert: true, new: true }
                );
                console.log(`✅ Variedad "${variedad.nombreComun}" actualizada/creada`);
            }
        } else {
            // Insertar nuevas variedades
            await VariedadPapa.insertMany(variedadesIniciales);
            console.log('✅ Variedades insertadas exitosamente');
        }
        
        // Mostrar resumen
        const totalVariedades = await VariedadPapa.countDocuments({ activa: true });
        const nombreVariedades = await VariedadPapa.find({ activa: true }, 'nombreComun');
        
        console.log('\n📊 Resumen de variedades disponibles:');
        console.log(`📍 Total de variedades activas: ${totalVariedades}`);
        console.log('🥔 Variedades disponibles:');
        nombreVariedades.forEach((v, index) => {
            console.log(`   ${index + 1}. ${v.nombreComun}`);
        });
        
        console.log('\n🎉 Inicialización completada exitosamente!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    inicializarVariedades();
}

module.exports = { inicializarVariedades, variedadesIniciales };