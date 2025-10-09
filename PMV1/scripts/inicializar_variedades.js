// Script para inicializar datos de variedades de papas nativas
const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/PapasDB';
        await mongoose.connect(mongoURI);
        console.log('✅ Conectado a MongoDB');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        return false;
    }
};

// Importar modelo
const VariedadPapa = require('./modelo/VariedadPapa');

// Datos de las variedades nativas del Perú
const variedadesNativas = [
    {
        nombreCientifico: 'Solanum tuberosum var. amarilla',
        nombreComun: 'amarilla',
        descripcion: 'Papa criolla tradicional peruana de color amarillo dorado, muy popular en la gastronomía nacional. Conocida por su sabor suave y textura cremosa.',
        origen: {
            pais: 'Perú',
            region: 'Andes Centrales',
            altitud: '2800-3800 msnm'
        },
        caracteristicas: {
            color: 'Amarillo dorado',
            forma: 'Ovalada a redonda',
            tamaño: 'Mediano (60-90g)',
            textura: 'Cremosa y harinosa'
        },
        usosCulinarios: [
            'Papa sancochada',
            'Papas rellenas',
            'Puré de papa',
            'Guisos tradicionales',
            'Causa limeña'
        ],
        valorNutricional: {
            carbohidratos: 20.1,
            proteinas: 2.0,
            vitaminas: ['Vitamina C', 'Vitamina B6', 'Potasio', 'Magnesio']
        },
        temporadaCultivo: {
            siembra: 'Octubre - Diciembre',
            cosecha: 'Abril - Junio'
        },
        activa: true,
        fechaRegistro: new Date()
    },
    {
        nombreCientifico: 'Solanum tuberosum var. huayro',
        nombreComun: 'huayro',
        descripcion: 'Papa nativa andina de forma alargada y piel rojiza. Muy resistente a condiciones climáticas adversas y valorada por su alto contenido nutricional.',
        origen: {
            pais: 'Perú',
            region: 'Andes del Sur',
            altitud: '3200-4200 msnm'
        },
        caracteristicas: {
            color: 'Rojizo con manchas moradas',
            forma: 'Alargada y cilíndrica',
            tamaño: 'Mediano a grande (80-120g)',
            textura: 'Firme y consistente'
        },
        usosCulinarios: [
            'Papa al horno',
            'Papas nativas hervidas',
            'Chuño (papa deshidratada)',
            'Sopas andinas',
            'Guisos de altura'
        ],
        valorNutricional: {
            carbohidratos: 18.5,
            proteinas: 2.3,
            vitaminas: ['Vitamina C', 'Antocianinas', 'Hierro', 'Zinc']
        },
        temporadaCultivo: {
            siembra: 'Septiembre - Noviembre',
            cosecha: 'Marzo - Mayo'
        },
        activa: true,
        fechaRegistro: new Date()
    },
    {
        nombreCientifico: 'Solanum tuberosum var. peruanita',
        nombreComun: 'peruanita',
        descripcion: 'Papa nativa pequeña de piel morada y pulpa amarilla. Considerada una joya de la biodiversidad peruana por su sabor único y propiedades antioxidantes.',
        origen: {
            pais: 'Perú',
            region: 'Andes del Norte y Centro',
            altitud: '2600-3600 msnm'
        },
        caracteristicas: {
            color: 'Morado intenso con pulpa amarilla',
            forma: 'Pequeña y redonda',
            tamaño: 'Pequeño (30-50g)',
            textura: 'Suave y mantecosa'
        },
        usosCulinarios: [
            'Papa cocida entera',
            'Ensaladas nativas',
            'Anticuchos de papa',
            'Platos gourmet',
            'Conservas andinas'
        ],
        valorNutricional: {
            carbohidratos: 19.8,
            proteinas: 2.1,
            vitaminas: ['Vitamina C', 'Antocianinas', 'Carotenoides', 'Polifenoles']
        },
        temporadaCultivo: {
            siembra: 'Octubre - Enero',
            cosecha: 'Abril - Julio'
        },
        activa: true,
        fechaRegistro: new Date()
    }
];

// Función para insertar variedades
const insertarVariedades = async () => {
    try {
        console.log('🌱 Iniciando inserción de variedades nativas...');
        
        // Limpiar colección existente
        await VariedadPapa.deleteMany({});
        console.log('🗑️ Datos anteriores eliminados');
        
        // Insertar nuevas variedades
        const resultado = await VariedadPapa.insertMany(variedadesNativas);
        console.log(`✅ ${resultado.length} variedades nativas insertadas exitosamente:`);
        
        resultado.forEach(variedad => {
            console.log(`   🥔 ${variedad.nombreComun.toUpperCase()} - ${variedad.nombreCientifico}`);
        });
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Error insertando variedades:', error.message);
        throw error;
    }
};

// Función principal
const main = async () => {
    try {
        console.log('🚀 Inicializando base de datos de variedades nativas...\n');
        
        // Conectar a base de datos
        const connected = await connectDB();
        if (!connected) {
            process.exit(1);
        }
        
        // Insertar variedades
        await insertarVariedades();
        
        console.log('\n🎉 Base de datos inicializada exitosamente!');
        console.log('📊 Variedades disponibles para clasificación:');
        console.log('   • Amarilla (Papa criolla tradicional)');
        console.log('   • Huayro (Papa andina resistente)');
        console.log('   • Peruanita (Papa morada pequeña)');
        
    } catch (error) {
        console.error('\n💥 Error en la inicialización:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión a MongoDB cerrada');
        process.exit(0);
    }
};

// Ejecutar solo si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { insertarVariedades, variedadesNativas };