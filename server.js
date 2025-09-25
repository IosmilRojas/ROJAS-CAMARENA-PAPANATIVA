import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Configurar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'PMV1')));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 🔗 Conexión a MongoDB Atlas
const connectDB = async () => {
  try {
    // URI hardcodeada temporalmente para debugging
    const uri = process.env.MONGODB_URI || 'mongodb+srv://rolfi:321@cluster0.yczwuya.mongodb.net/PapasDB?retryWrites=true&w=majority&appName=Cluster0';
    console.log('🔗 Conectando a MongoDB con URI:', uri.substring(0, 30) + '...');
    
    await mongoose.connect(uri);
    console.log("✅ Conectado a MongoDB Atlas");
  } catch (err) {
    console.error("❌ Error de conexión a MongoDB:", err);
    // Intentar conexión local si falla Atlas
    try {
      const localUri = process.env.MONGODB_LOCAL || 'mongodb://localhost:27017/PapasDB';
      console.log('🔗 Intentando conexión local:', localUri);
      await mongoose.connect(localUri);
      console.log("✅ Conectado a MongoDB local (Compass)");
    } catch (localErr) {
      console.error("❌ Error de conexión local:", localErr);
      console.log("💡 Asegúrate de que MongoDB Atlas esté configurado o MongoDB local esté ejecutándose");
      process.exit(1);
    }
  }
};

// 📌 Esquemas de la base de datos - ENTIDADES PRINCIPALES

// 👤 ENTIDAD: Usuario - Colección de usuarios del sistema
const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  rol: {
    type: String,
    enum: ['admin', 'operador', 'visualizador'],
    default: 'operador'
  },
  activo: {
    type: Boolean,
    default: true
  },
  ultimo_acceso: Date,
  total_predicciones: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 🥔 ENTIDAD: Variedad - Tipos de papa soportados
const variedadSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    enum: ['Huayro', 'Peruanita', 'Amarilla'], // Manteniendo Amarilla según solicitado
    unique: true
  },
  descripcion: String,
  caracteristicas: [String],
  activa: {
    type: Boolean,
    default: true
  },
  total_predicciones: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 🚨 ENTIDAD: Defecto - Anomalías detectables en papas
const defectoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['superficie', 'forma', 'color', 'textura'],
    required: true
  },
  severidad: {
    type: String,
    enum: ['leve', 'moderado', 'severo'],
    default: 'leve'
  },
  descripcion: String,
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 🏷️ ENTIDAD: Etiqueta - Anotaciones humanas sobre imágenes
const etiquetaSchema = new mongoose.Schema({
  imagen_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Imagen',
    required: true
  },
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  variedad_etiquetada: {
    type: String,
    enum: ['Huayro', 'Peruanita', 'Amarilla'],
    required: true
  },
  condicion_etiquetada: {
    type: String,
    enum: ['Apto', 'No Apto'],
    required: true
  },
  defectos_identificados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Defecto'
  }],
  notas: String,
  validada: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 📷 ENTIDAD: Imagen - Representa las imágenes de papas capturadas
const imagenSchema = new mongoose.Schema({
  nombre_archivo: {
    type: String,
    required: true
  },
  ruta: {
    type: String,
    required: true
  },
  tamaño: Number,
  tipo_mime: String,
  dimensiones: {
    ancho: Number,
    alto: Number
  },
  origen: {
    type: String,
    enum: ['web', 'movil', 'api'],
    default: 'web'
  },
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  dataset: {
    type: String,
    enum: ['train', 'test', 'val', 'production'],
    default: 'production'
  },
  etiquetada: {
    type: Boolean,
    default: false
  },
  procesada: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 🎯 ENTIDAD: Resultado - Predicciones del modelo de IA
const resultadoSchema = new mongoose.Schema({
  imagen_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Imagen',
    required: true
  },
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  variedad_predicha: {
    type: String,
    required: true,
    enum: ['Huayro', 'Peruanita', 'Amarilla']
  },
  condicion_predicha: {
    type: String,
    required: true,
    enum: ['Apto', 'No Apto']
  },
  probabilidad: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  probabilidades_detalladas: {
    huayro_apto: Number,
    huayro_no_apto: Number,
    peruanita_apto: Number,
    peruanita_no_apto: Number,
    amarilla_apto: Number,
    amarilla_no_apto: Number
  },
  defectos_detectados: [{
    defecto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Defecto'
    },
    confianza: Number,
    coordenadas: {
      x: Number,
      y: Number,
      ancho: Number,
      alto: Number
    }
  }],
  tiempo_procesamiento: Number, // en milisegundos
  version_modelo: String,
  metadata: {
    ip_usuario: String,
    user_agent: String,
    navegador: String
  }
}, {
  timestamps: true
});

// ESQUEMA COMPATIBLE - Mantener compatibilidad con código existente
const prediccionSchema = new mongoose.Schema({
  variedad: {
    type: String,
    required: true,
    enum: ['Huayro', 'Peruanita', 'Amarilla'] // Manteniendo Amarilla
  },
  condicion: {
    type: String,
    required: true,
    enum: ['Apto', 'No Apto']
  },
  probabilidad: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  imagen: {
    nombre: String,
    ruta: String,
    tamaño: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip_usuario: String,
  user_agent: String,
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
prediccionSchema.index({ timestamp: -1 });
prediccionSchema.index({ variedad: 1, condicion: 1 });
resultadoSchema.index({ createdAt: -1 });
imagenSchema.index({ createdAt: -1, dataset: 1 });
usuarioSchema.index({ email: 1 });

// Modelos
const Usuario = mongoose.model("Usuario", usuarioSchema);
const Variedad = mongoose.model("Variedad", variedadSchema);
const Defecto = mongoose.model("Defecto", defectoSchema);
const Etiqueta = mongoose.model("Etiqueta", etiquetaSchema);
const Imagen = mongoose.model("Imagen", imagenSchema);
const Resultado = mongoose.model("Resultado", resultadoSchema);
const Prediccion = mongoose.model("Prediccion", prediccionSchema);

// 📊 Esquema para estadísticas
const estadisticaSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    default: Date.now
  },
  total_predicciones: Number,
  predicciones_por_variedad: {
    huayro: { apto: Number, no_apto: Number },
    peruanita: { apto: Number, no_apto: Number },
    amarilla: { apto: Number, no_apto: Number }
  },
  promedio_confianza: Number
});

const Estadistica = mongoose.model("Estadistica", estadisticaSchema);

// 📥 Endpoint para guardar predicciones
app.post("/api/prediccion", upload.single('imagen'), async (req, res) => {
  try {
    console.log("📥 Nueva predicción recibida:", req.body);
    console.log("📷 Archivo de imagen:", req.file);
    
    const { variedad, condicion, probabilidad } = req.body;
    
    // Validar datos
    if (!variedad || !condicion || !probabilidad) {
      console.log("❌ Faltan datos requeridos:", { variedad, condicion, probabilidad });
      return res.status(400).json({ 
        error: "Faltan datos requeridos: variedad, condicion, probabilidad" 
      });
    }

    console.log("✅ Datos validados correctamente");
    
    const nuevaPrediccion = new Prediccion({
      variedad: variedad,
      condicion: condicion,
      probabilidad: parseFloat(probabilidad),
      imagen: req.file ? {
        nombre: req.file.originalname,
        ruta: req.file.path,
        tamaño: req.file.size
      } : null,
      ip_usuario: req.ip,
      user_agent: req.get('User-Agent')
    });

    console.log("💾 Intentando guardar en MongoDB:", nuevaPrediccion);
    
    const prediccionGuardada = await nuevaPrediccion.save();
    console.log("✅ Predicción guardada exitosamente:", prediccionGuardada._id);
    
    res.json({ 
      mensaje: "✅ Predicción guardada exitosamente",
      id: prediccionGuardada._id,
      datos: prediccionGuardada
    });
  } catch (err) {
    console.error("❌ Error al guardar predicción:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📤 Endpoint para listar predicciones
app.get("/api/predicciones", async (req, res) => {
  try {
    const { limit = 10, skip = 0, variedad, condicion } = req.query;
    
    let filtro = {};
    if (variedad) filtro.variedad = variedad;
    if (condicion) filtro.condicion = condicion;

    const predicciones = await Prediccion
      .find(filtro)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-user_agent -ip_usuario'); // No enviar datos sensibles al frontend

    const total = await Prediccion.countDocuments(filtro);

    res.json({
      predicciones,
      total,
      pagina: Math.floor(skip / limit) + 1,
      total_paginas: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🆕 ENDPOINTS PARA CUMPLIR REQUERIMIENTOS PMV1

// 👥 CRUD Usuarios
app.post("/api/usuarios", async (req, res) => {
  try {
    const { nombre, email, rol } = req.body;
    const usuario = new Usuario({ nombre, email, rol });
    await usuario.save();
    res.status(201).json({ mensaje: "Usuario creado", usuario });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/usuarios", async (req, res) => {
  try {
    const usuarios = await Usuario.find({ activo: true }).select('-__v');
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🥔 CRUD Variedades
app.get("/api/variedades", async (req, res) => {
  try {
    const variedades = await Variedad.find({ activa: true });
    res.json(variedades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/variedades", async (req, res) => {
  try {
    const variedad = new Variedad(req.body);
    await variedad.save();
    res.status(201).json(variedad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚨 CRUD Defectos
app.get("/api/defectos", async (req, res) => {
  try {
    const defectos = await Defecto.find({ activo: true });
    res.json(defectos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/defectos", async (req, res) => {
  try {
    const defecto = new Defecto(req.body);
    await defecto.save();
    res.status(201).json(defecto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📷 CRUD Imágenes - Almacenamiento de dataset estructurado
app.post("/api/imagenes", upload.single('imagen'), async (req, res) => {
  try {
    const { dataset, usuario_id } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: "No se envió imagen" });
    }

    // Detectar dimensiones de la imagen
    const imagen = new Imagen({
      nombre_archivo: req.file.originalname,
      ruta: req.file.path,
      tamaño: req.file.size,
      tipo_mime: req.file.mimetype,
      dataset: dataset || 'production',
      usuario_id: usuario_id || null,
      origen: 'web'
    });

    await imagen.save();
    res.status(201).json({ mensaje: "Imagen guardada en dataset", imagen });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/imagenes", async (req, res) => {
  try {
    const { dataset, etiquetada, limit = 50 } = req.query;
    let filtro = {};
    
    if (dataset) filtro.dataset = dataset;
    if (etiquetada !== undefined) filtro.etiquetada = etiquetada === 'true';
    
    const imagenes = await Imagen
      .find(filtro)
      .populate('usuario_id', 'nombre email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
      
    res.json(imagenes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🏷️ CRUD Etiquetas - Anotaciones humanas
app.post("/api/etiquetas", async (req, res) => {
  try {
    const { imagen_id, usuario_id, variedad_etiquetada, condicion_etiquetada, defectos_identificados, notas } = req.body;
    
    const etiqueta = new Etiqueta({
      imagen_id,
      usuario_id,
      variedad_etiquetada,
      condicion_etiquetada,
      defectos_identificados,
      notas
    });
    
    await etiqueta.save();
    
    // Marcar imagen como etiquetada
    await Imagen.findByIdAndUpdate(imagen_id, { etiquetada: true });
    
    res.status(201).json({ mensaje: "Etiqueta creada", etiqueta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/etiquetas", async (req, res) => {
  try {
    const etiquetas = await Etiqueta
      .find()
      .populate('imagen_id', 'nombre_archivo ruta')
      .populate('usuario_id', 'nombre email')
      .populate('defectos_identificados', 'nombre tipo severidad')
      .sort({ createdAt: -1 });
      
    res.json(etiquetas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🎯 CRUD Resultados - Predicciones detalladas del modelo
app.post("/api/resultados", upload.single('imagen'), async (req, res) => {
  try {
    const startTime = Date.now();
    const { 
      variedad_predicha, 
      condicion_predicha, 
      probabilidad,
      usuario_id,
      probabilidades_detalladas 
    } = req.body;

    // Guardar imagen si se envió
    let imagen_id = null;
    if (req.file) {
      const imagen = new Imagen({
        nombre_archivo: req.file.originalname,
        ruta: req.file.path,
        tamaño: req.file.size,
        tipo_mime: req.file.mimetype,
        usuario_id: usuario_id || null,
        origen: 'web',
        procesada: true
      });
      const imagenGuardada = await imagen.save();
      imagen_id = imagenGuardada._id;
    }

    // Crear resultado detallado
    const resultado = new Resultado({
      imagen_id,
      usuario_id: usuario_id || null,
      variedad_predicha,
      condicion_predicha,
      probabilidad: parseFloat(probabilidad),
      probabilidades_detalladas: probabilidades_detalladas ? JSON.parse(probabilidades_detalladas) : null,
      tiempo_procesamiento: Date.now() - startTime,
      version_modelo: "1.0",
      metadata: {
        ip_usuario: req.ip,
        user_agent: req.get('User-Agent'),
        navegador: req.get('User-Agent')?.split(' ')[0] || 'unknown'
      }
    });

    await resultado.save();

    // Actualizar contador del usuario si existe
    if (usuario_id) {
      await Usuario.findByIdAndUpdate(usuario_id, {
        $inc: { total_predicciones: 1 },
        ultimo_acceso: new Date()
      });
    }

    res.status(201).json({ 
      mensaje: "Resultado guardado con detalles completos",
      id: resultado._id,
      tiempo_procesamiento: resultado.tiempo_procesamiento
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/resultados", async (req, res) => {
  try {
    const { limit = 50, skip = 0, variedad, condicion } = req.query;
    let filtro = {};
    
    if (variedad) filtro.variedad_predicha = variedad;
    if (condicion) filtro.condicion_predicha = condicion;
    
    const resultados = await Resultado
      .find(filtro)
      .populate('imagen_id', 'nombre_archivo ruta tamaño')
      .populate('usuario_id', 'nombre email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
      
    const total = await Resultado.countDocuments(filtro);
    
    res.json({
      resultados,
      total,
      pagina: Math.floor(skip / limit) + 1,
      total_paginas: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📈 Endpoint de métricas de precisión - Requerimiento de precisión ≥85%
app.get("/api/metricas-precision", async (req, res) => {
  try {
    // Obtener resultados con etiquetas para calcular precisión
    const resultadosEtiquetados = await Resultado.aggregate([
      {
        $lookup: {
          from: 'etiquetas',
          localField: 'imagen_id',
          foreignField: 'imagen_id',
          as: 'etiqueta'
        }
      },
      {
        $match: { 'etiqueta.0': { $exists: true } }
      },
      {
        $addFields: {
          etiqueta: { $arrayElemAt: ['$etiqueta', 0] },
          prediccion_correcta_variedad: {
            $eq: ['$variedad_predicha', { $arrayElemAt: ['$etiqueta.variedad_etiquetada', 0] }]
          },
          prediccion_correcta_condicion: {
            $eq: ['$condicion_predicha', { $arrayElemAt: ['$etiqueta.condicion_etiquetada', 0] }]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          aciertos_variedad: { $sum: { $cond: ['$prediccion_correcta_variedad', 1, 0] } },
          aciertos_condicion: { $sum: { $cond: ['$prediccion_correcta_condicion', 1, 0] } },
          aciertos_completos: { 
            $sum: { 
              $cond: [{ 
                $and: ['$prediccion_correcta_variedad', '$prediccion_correcta_condicion'] 
              }, 1, 0] 
            } 
          }
        }
      }
    ]);

    const metricas = resultadosEtiquetados[0] || { total: 0, aciertos_variedad: 0, aciertos_condicion: 0, aciertos_completos: 0 };
    
    const precision_variedad = metricas.total > 0 ? (metricas.aciertos_variedad / metricas.total) * 100 : 0;
    const precision_condicion = metricas.total > 0 ? (metricas.aciertos_condicion / metricas.total) * 100 : 0;
    const precision_completa = metricas.total > 0 ? (metricas.aciertos_completos / metricas.total) * 100 : 0;

    res.json({
      total_evaluaciones: metricas.total,
      precision_variedad: precision_variedad.toFixed(2),
      precision_condicion: precision_condicion.toFixed(2),
      precision_completa: precision_completa.toFixed(2),
      cumple_requerimiento: precision_completa >= 85,
      requerimiento_minimo: 85
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📊 Endpoint para estadísticas
app.get("/api/estadisticas", async (req, res) => {
  try {
    const stats = await Prediccion.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          promedio_confianza: { $avg: "$probabilidad" },
          por_variedad: {
            $push: {
              variedad: "$variedad",
              condicion: "$condicion"
            }
          }
        }
      }
    ]);

    const estadisticasPorVariedad = await Prediccion.aggregate([
      {
        $group: {
          _id: { variedad: "$variedad", condicion: "$condicion" },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      total_predicciones: stats[0]?.total || 0,
      promedio_confianza: stats[0]?.promedio_confianza || 0,
      por_variedad: estadisticasPorVariedad
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ Endpoint para limpiar predicciones
app.delete("/api/predicciones", async (req, res) => {
  try {
    const resultado = await Prediccion.deleteMany({});
    res.json({ 
      mensaje: `✅ ${resultado.deletedCount} predicciones eliminadas`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔍 Endpoint para buscar por ID
app.get("/api/prediccion/:id", async (req, res) => {
  try {
    const prediccion = await Prediccion.findById(req.params.id);
    if (!prediccion) {
      return res.status(404).json({ error: "Predicción no encontrada" });
    }
    res.json(prediccion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir archivos estáticos del frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'PMV1', 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📱 Frontend disponible en http://localhost:${PORT}`);
    console.log(`🔌 API disponible en http://localhost:${PORT}/api`);
  });
});
