// Modelo de datos - Clasificación
const mongoose = require('mongoose');

const clasificacionSchema = new mongoose.Schema({
    idClasificacion: {
        type: String,
        unique: true,
        default: function() {
            return 'CLS_' + Date.now();
        }
    },
    idUsuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    idImagen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Imagen',
        required: true
    },
    idVariedad: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VariedadPapa',
        required: true
    },
    confianza: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    confianzaPorcentaje: {
        type: Number,
        get: function() {
            return Math.round(this.confianza * 100);
        }
    },
    condicion: {
        type: String,
        enum: ['apto', 'no apto'],
        required: true,
        default: 'apto'
    },
    prediccionesAlternativas: [{
        variedad: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VariedadPapa'
        },
        confianza: { type: Number }
    }],
    estado: {
        type: String,
        enum: ['pendiente', 'procesada', 'validada', 'rechazada'],
        default: 'procesada'
    },
    tiempoProcesamientoMs: {
        type: Number
    },
    metadatosIA: {
        modeloVersion: { type: String },
        algoritmo: { type: String },
        parametros: { type: mongoose.Schema.Types.Mixed }
    },
    fechaClasificacion: {
        type: Date,
        default: Date.now
    },
    validadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario'
    },
    fechaValidacion: {
        type: Date
    },
    observaciones: {
        type: String
    }
}, {
    timestamps: true,
    collection: 'clasificaciones'
});

// Índices para consultas eficientes
clasificacionSchema.index({ fechaClasificacion: -1 });
clasificacionSchema.index({ idUsuario: 1, fechaClasificacion: -1 });
clasificacionSchema.index({ estado: 1 });
clasificacionSchema.index({ confianza: -1 });

// Método estático para obtener estadísticas
clasificacionSchema.statics.obtenerEstadisticas = async function(filtros = {}) {
    return this.aggregate([
        { $match: filtros },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                confianzaPromedio: { $avg: '$confianza' },
                confianzaMaxima: { $max: '$confianza' },
                confianzaMinima: { $min: '$confianza' }
            }
        }
    ]);
};

// Método para validar clasificación
clasificacionSchema.methods.validar = function(usuarioValidador, observaciones = '') {
    this.estado = 'validada';
    this.validadoPor = usuarioValidador;
    this.fechaValidacion = new Date();
    this.observaciones = observaciones;
    return this.save();
};

module.exports = mongoose.model('Clasificacion', clasificacionSchema);