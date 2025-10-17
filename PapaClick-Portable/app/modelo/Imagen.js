// Modelo de datos - Imagen
const mongoose = require('mongoose');

const imagenSchema = new mongoose.Schema({
    idImagen: {
        type: String,
        unique: true,
        default: function() {
            return 'IMG_' + Date.now();
        }
    },
    urlImagen: {
        type: String,
        required: true
    },
    nombreOriginal: {
        type: String,
        required: true
    },
    tamaño: {
        type: Number,
        required: true
    },
    formato: {
        type: String,
        required: true,
        enum: ['jpg', 'jpeg', 'png', 'webp']
    },
    dimensiones: {
        ancho: { type: Number },
        alto: { type: Number }
    },
    fechaSubida: {
        type: Date,
        default: Date.now
    },
    usuarioSubida: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    metadatos: {
        calidad: { type: String },
        dispositivo: { type: String },
        ubicacion: { type: String }
    },
    procesada: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'imagenes'
});

// Índices para mejorar consultas
imagenSchema.index({ fechaSubida: -1 });
imagenSchema.index({ usuarioSubida: 1 });
imagenSchema.index({ procesada: 1 });

// Método para obtener URL completa
imagenSchema.methods.obtenerUrlCompleta = function() {
    return process.env.BASE_URL + '/' + this.urlImagen;
};

// Virtual para obtener extensión del archivo
imagenSchema.virtual('extension').get(function() {
    return this.formato.toLowerCase();
});

module.exports = mongoose.model('Imagen', imagenSchema);