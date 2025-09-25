import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Conectar a MongoDB
async function conectarDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    process.exit(1);
  }
}

// Esquemas
const prediccionSchema = new mongoose.Schema({
  variedad: { type: String, required: true, enum: ['Huayro', 'Peruanita', 'Amarilla'] },
  condicion: { type: String, required: true, enum: ['Apto', 'No Apto'] },
  probabilidad: { type: Number, required: true, min: 0, max: 1 },
  imagen: {
    nombre: String,
    ruta: String,
    tamaño: Number
  },
  timestamp: { type: Date, default: Date.now },
  ip_usuario: String,
  user_agent: String
}, { timestamps: true });

const Prediccion = mongoose.model('Prediccion', prediccionSchema);

// Funciones de administración
async function crearIndices() {
  try {
    await Prediccion.createIndexes([
      { timestamp: -1 },
      { variedad: 1, condicion: 1 },
      { probabilidad: -1 }
    ]);
    console.log('✅ Índices creados');
  } catch (error) {
    console.error('❌ Error creando índices:', error);
  }
}

async function obtenerEstadisticas() {
  try {
    const total = await Prediccion.countDocuments();
    const porVariedad = await Prediccion.aggregate([
      {
        $group: {
          _id: { variedad: '$variedad', condicion: '$condicion' },
          count: { $sum: 1 },
          promedioConfianza: { $avg: '$probabilidad' }
        }
      },
      { $sort: { '_id.variedad': 1, '_id.condicion': 1 } }
    ]);

    console.log('\n📊 ESTADÍSTICAS DE LA BASE DE DATOS');
    console.log('=====================================');
    console.log(`Total de predicciones: ${total}`);
    console.log('\nPor variedad y condición:');
    
    porVariedad.forEach(item => {
      const { variedad, condicion } = item._id;
      console.log(`${variedad} - ${condicion}: ${item.count} (confianza promedio: ${(item.promedioConfianza * 100).toFixed(1)}%)`);
    });

    const ultimaPrediccion = await Prediccion.findOne().sort({ timestamp: -1 });
    if (ultimaPrediccion) {
      console.log(`\nÚltima predicción: ${ultimaPrediccion.timestamp}`);
    }
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
  }
}

async function limpiarBaseDatos() {
  try {
    const resultado = await Prediccion.deleteMany({});
    console.log(`✅ ${resultado.deletedCount} predicciones eliminadas`);
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  }
}

async function insertarDatosPrueba() {
  const datosPrueba = [
    { variedad: 'Huayro', condicion: 'Apto', probabilidad: 0.95 },
    { variedad: 'Huayro', condicion: 'No Apto', probabilidad: 0.87 },
    { variedad: 'Peruanita', condicion: 'Apto', probabilidad: 0.92 },
    { variedad: 'Peruanita', condicion: 'No Apto', probabilidad: 0.78 },
    { variedad: 'Amarilla', condicion: 'Apto', probabilidad: 0.89 },
    { variedad: 'Amarilla', condicion: 'No Apto', probabilidad: 0.83 }
  ];

  try {
    await Prediccion.insertMany(datosPrueba);
    console.log('✅ Datos de prueba insertados');
  } catch (error) {
    console.error('❌ Error insertando datos de prueba:', error);
  }
}

// Función principal
async function main() {
  await conectarDB();

  const comando = process.argv[2];
  
  switch (comando) {
    case 'stats':
      await obtenerEstadisticas();
      break;
    case 'indices':
      await crearIndices();
      break;
    case 'limpiar':
      await limpiarBaseDatos();
      break;
    case 'prueba':
      await insertarDatosPrueba();
      break;
    case 'init':
      await crearIndices();
      await insertarDatosPrueba();
      console.log('✅ Base de datos inicializada');
      break;
    default:
      console.log(`
📱 PAPACLICK - Administrador de Base de Datos
===========================================

Comandos disponibles:
  node admin.js stats     - Ver estadísticas
  node admin.js indices   - Crear índices
  node admin.js limpiar   - Limpiar todas las predicciones
  node admin.js prueba    - Insertar datos de prueba
  node admin.js init      - Inicializar BD completa
      `);
  }

  await mongoose.connection.close();
  process.exit(0);
}

main().catch(console.error);