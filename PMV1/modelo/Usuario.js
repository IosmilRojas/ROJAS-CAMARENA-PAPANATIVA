// Modelo de datos - Usuario
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
    idUsuario: {
        type: String,
        unique: true,
        default: function() {
            return 'USR_' + Date.now();
        }
    },
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    apellido: {
        type: String,
        required: false,
        trim: true
    },
    // Documento de identidad (DNI/RUC u otro)
    dni: {
        type: String,
        required: false,
        trim: true,
        unique: false
    },
    telefono: {
        type: String,
        required: false,
        trim: true
    },
    // Dirección libre
    direccion: {
        type: String,
        required: false,
        trim: true
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    contraseña: {
        type: String,
        required: true,
        minlength: 6
    },
    // URL de avatar/foto de perfil
    avatarUrl: {
        type: String,
        required: false,
        trim: true
    },
    genero: {
        type: String,
        enum: ['masculino', 'femenino', 'otro', 'no-especifica'],
        required: false,
        default: 'no-especifica'
    },
    fechaNacimiento: {
        type: Date,
        required: false
    },
    ubicacion: {
        departamento: { type: String, trim: true, required: false },
        provincia: { type: String, trim: true, required: false },
        distrito: { type: String, trim: true, required: false }
    },
    rol: {
        type: String,
        enum: ['administrador', 'operador', 'consultor'],
        default: 'operador'
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    },
    ultimoAcceso: {
        type: Date,
        default: Date.now
    },
    activo: {
        type: Boolean,
        default: true
    },
    verificado: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'usuarios'
});

// Middleware para encriptar contraseña antes de guardar
usuarioSchema.pre('save', async function(next) {
    if (!this.isModified('contraseña')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.contraseña = await bcrypt.hash(this.contraseña, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas (compatible con texto plano y bcrypt)
usuarioSchema.methods.compararContraseña = async function(contraseñaCandidata) {
    // Si la contraseña está hasheada con bcrypt
    if (this.contraseña.startsWith('$2a$') || this.contraseña.startsWith('$2b$')) {
        return await bcrypt.compare(contraseñaCandidata, this.contraseña);
    }
    
    // Si es texto plano (usuarios antiguos), comparar directamente
    return contraseñaCandidata === this.contraseña;
};

// Método para actualizar último acceso
usuarioSchema.methods.actualizarUltimoAcceso = function() {
    this.ultimoAcceso = new Date();
    return this.save();
};

module.exports = mongoose.model('Usuario', usuarioSchema);