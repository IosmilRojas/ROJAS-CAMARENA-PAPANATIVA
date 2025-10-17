// Modelo de datos - Trazabilidad
const mongoose = require('mongoose');

const trazabilidadSchema = new mongoose.Schema({
    idTrazabilidad: {
        type: String,
        unique: true,
        default: function() {
            return 'TRZ_' + Date.now();
        }
    },
    idClasificacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clasificacion',
        required: true
    },
    responsable: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    accion: {
        type: String,
        required: true,
        enum: [
            'clasificacion_creada',
            'clasificacion_validada',
            'clasificacion_rechazada',
            'imagen_procesada',
            'resultado_exportado',
            'modelo_actualizado'
        ]
    },
    observaciones: {
        type: String,
        required: true
    },
    datosAnteriores: {
        type: mongoose.Schema.Types.Mixed
    },
    datosNuevos: {
        type: mongoose.Schema.Types.Mixed
    },
    metadatos: {
        ip: { type: String },
        userAgent: { type: String },
        ubicacion: { type: String }
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'trazabilidad'
});

// Índices para auditoría y consultas
trazabilidadSchema.index({ fechaRegistro: -1 });
trazabilidadSchema.index({ idClasificacion: 1, fechaRegistro: -1 });
trazabilidadSchema.index({ responsable: 1, fechaRegistro: -1 });
trazabilidadSchema.index({ accion: 1 });

// Método estático para crear registro de trazabilidad
trazabilidadSchema.statics.crearRegistro = function(datos) {
    return new this({
        idClasificacion: datos.idClasificacion,
        responsable: datos.responsable,
        accion: datos.accion,
        observaciones: datos.observaciones,
        datosAnteriores: datos.datosAnteriores || null,
        datosNuevos: datos.datosNuevos || null,
        metadatos: datos.metadatos || {}
    }).save();
};

// Método para obtener historial de una clasificación
trazabilidadSchema.statics.obtenerHistorial = function(idClasificacion) {
    return this.find({ idClasificacion })
        .populate('responsable', 'nombre correo')
        .sort({ fechaRegistro: -1 });
};

// Virtual para descripción amigable de la acción
trazabilidadSchema.virtual('accionDescripcion').get(function() {
    const descripciones = {
        'clasificacion_creada': 'Clasificación creada',
        'clasificacion_validada': 'Clasificación validada',
        'clasificacion_rechazada': 'Clasificación rechazada',
        'imagen_procesada': 'Imagen procesada',
        'resultado_exportado': 'Resultado exportado',
        'modelo_actualizado': 'Modelo actualizado'
    };
    return descripciones[this.accion] || this.accion;
});

module.exports = mongoose.model('Trazabilidad', trazabilidadSchema);