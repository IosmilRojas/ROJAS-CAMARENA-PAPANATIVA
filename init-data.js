// 🚀 Script de inicialización de datos para PMV1 - PAPACLICK
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Conexión a MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://rolfi:321@cluster0.yczwuya.mongodb.net/PapasDB?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(uri);
    console.log("✅ Conectado a MongoDB Atlas");
  } catch (err) {
    console.error("❌ Error de conexión:", err);
    process.exit(1);
  }
};

// Esquemas (simplificados para inicialización)
const variedadSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  descripcion: String,
  caracteristicas: [String],
  activa: { type: Boolean, default: true },
  total_predicciones: { type: Number, default: 0 }
}, { timestamps: true });

const defectoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  tipo: { type: String, required: true },
  severidad: { type: String, default: 'leve' },
  descripcion: String,
  activo: { type: Boolean, default: true }
}, { timestamps: true });

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  rol: { type: String, default: 'operador' },
  activo: { type: Boolean, default: true },
  ultimo_acceso: Date,
  total_predicciones: { type: Number, default: 0 }
}, { timestamps: true });

const Variedad = mongoose.model("Variedad", variedadSchema);
const Defecto = mongoose.model("Defecto", defectoSchema);
const Usuario = mongoose.model("Usuario", usuarioSchema);

// 📊 Datos iniciales
const variedadesIniciales = [
  {
    nombre: "Huayro",
    descripcion: "Papa nativa con cáscara rosada y pulpa amarilla",
    caracteristicas: ["Resistente a bajas temperaturas", "Alto valor nutricional", "Textura harinosa"]
  },
  {
    nombre: "Peruanita",
    descripcion: "Papa nativa de tamaño pequeño con excelente sabor",
    caracteristicas: ["Sabor intenso", "Ideal para hervir", "Rica en antioxidantes"]
  },
  {
    nombre: "Amarilla",
    descripcion: "Papa amarilla tradicional peruana",
    caracteristicas: ["Pulpa amarilla intensa", "Textura cremosa", "Versatil en cocina"]
  }
];

const defectosIniciales = [
  {
    nombre: "Mancha oscura",
    tipo: "superficie",
    severidad: "moderado",
    descripcion: "Manchas oscuras en la superficie de la papa"
  },
  {
    nombre: "Deformación",
    tipo: "forma",
    severidad: "leve",
    descripcion: "Papa con forma irregular o deformada"
  },
  {
    nombre: "Corte o herida",
    tipo: "superficie",
    severidad: "severo",
    descripcion: "Cortes, heridas o daños físicos visibles"
  },
  {
    nombre: "Coloración anormal",
    tipo: "color",
    severidad: "moderado",
    descripción: "Color inusual que indica problemas internos"
  },
  {
    nombre: "Textura rugosa",
    tipo: "textura",
    severidad: "leve",
    descripción: "Superficie más rugosa de lo normal"
  }
];

const usuariosIniciales = [
  {
    nombre: "Administrador Sistema",
    email: "admin@papaclick.com",
    rol: "admin"
  },
  {
    nombre: "Operador Demo",
    email: "operador@papaclick.com",
    rol: "operador"
  }
];

// 🔧 Función de inicialización
const inicializarDatos = async () => {
  try {
    console.log("🚀 Iniciando configuración de datos PMV1...\n");

    // Limpiar datos existentes
    console.log("🧹 Limpiando datos existentes...");
    await Variedad.deleteMany({});
    await Defecto.deleteMany({});
    await Usuario.deleteMany({});
    console.log("✅ Datos limpiados\n");

    // Insertar variedades
    console.log("🥔 Insertando variedades...");
    for (const variedad of variedadesIniciales) {
      const nuevaVariedad = new Variedad(variedad);
      await nuevaVariedad.save();
      console.log(`   ✅ ${variedad.nombre} agregada`);
    }
    console.log("");

    // Insertar defectos
    console.log("🚨 Insertando tipos de defectos...");
    for (const defecto of defectosIniciales) {
      const nuevoDefecto = new Defecto(defecto);
      await nuevoDefecto.save();
      console.log(`   ✅ ${defecto.nombre} agregado`);
    }
    console.log("");

    // Insertar usuarios
    console.log("👥 Insertando usuarios iniciales...");
    for (const usuario of usuariosIniciales) {
      const nuevoUsuario = new Usuario(usuario);
      await nuevoUsuario.save();
      console.log(`   ✅ ${usuario.nombre} agregado`);
    }
    console.log("");

    // Verificar datos insertados
    const totalVariedades = await Variedad.countDocuments();
    const totalDefectos = await Defecto.countDocuments();
    const totalUsuarios = await Usuario.countDocuments();

    console.log("📊 RESUMEN DE INICIALIZACIÓN:");
    console.log(`   🥔 Variedades: ${totalVariedades}`);
    console.log(`   🚨 Defectos: ${totalDefectos}`);
    console.log(`   👥 Usuarios: ${totalUsuarios}`);
    console.log("");
    console.log("✅ ¡Inicialización completada exitosamente!");
    console.log("");
    console.log("🎯 PMV1 LISTO PARA OPERAR:");
    console.log("   - Variedades configuradas: Huayro, Peruanita, Amarilla");
    console.log("   - Sistema de defectos configurado");
    console.log("   - Usuarios de ejemplo creados");
    console.log("   - Base de datos estructurada");
    console.log("");
    console.log("🚀 Ejecuta 'npm start' para iniciar el servidor");

  } catch (error) {
    console.error("❌ Error durante la inicialización:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Ejecutar inicialización
connectDB().then(inicializarDatos);