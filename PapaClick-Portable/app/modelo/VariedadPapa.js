// Modelo de datos - Variedad de Papa
const mongoose = require('mongoose');

const variedadPapaSchema = new mongoose.Schema({
    idVariedad: {
        type: String,
        unique: true,
        default: function() {
            return 'VAR_' + Date.now();
        }
    },
    nombreCientifico: {
        type: String,
        required: true,
        trim: true
    },
    nombreComun: {
        type: String,
        required: true,
        trim: true
    },
    descripcion: {
        type: String,
        required: true
    },
    origen: {
        pais: { type: String },
        region: { type: String },
        altitud: { type: String }
    },
    caracteristicas: {
        color: { type: String },
        forma: { type: String },
        tamaño: { type: String },
        textura: { type: String }
    },
    usosCulinarios: [{
        type: String
    }],
    valorNutricional: {
        carbohidratos: { type: Number },
        proteinas: { type: Number },
        vitaminas: [{ type: String }]
    },
    temporadaCultivo: {
        siembra: { type: String },
        cosecha: { type: String }
    },
    activa: {
        type: Boolean,
        default: true
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'variedades_papa'
});

// Índices para búsquedas eficientes
variedadPapaSchema.index({ nombreComun: 'text', nombreCientifico: 'text' });
variedadPapaSchema.index({ activa: 1 });

// Método para obtener variedades activas
variedadPapaSchema.statics.obtenerActivas = function() {
    return this.find({ activa: true }).sort({ nombreComun: 1 });
};

// Virtual para nombre completo
variedadPapaSchema.virtual('nombreCompleto').get(function() {
    return `${this.nombreComun} (${this.nombreCientifico})`;
});

module.exports = mongoose.model('VariedadPapa', variedadPapaSchema);