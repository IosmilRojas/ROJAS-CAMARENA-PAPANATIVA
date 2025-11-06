// Modelo de Registro de Auditoría/Reportes
const mongoose = require('mongoose');

const registroAuditoriaSchema = new mongoose.Schema({
    idRegistro: {
        type: String,
        unique: true,
        default: function() {
            return 'REG_' + Date.now();
        }
    },
    // Usuario que realizó la acción
    idUsuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    nombreUsuario: {
        type: String,
        required: true
    },
    // Tipo de acción
    tipoAccion: {
        type: String,
        enum: [
            'crear_usuario',
            'editar_usuario',
            'eliminar_usuario',
            'cambiar_rol',
            'cambiar_permisos',
            'clasificar_papa',
            'validar_clasificacion',
            'generar_reporte',
            'exportar_datos',
            'login',
            'logout',
            'cambiar_contraseña',
            'acceso_denegado'
        ],
        required: true
    },
    // Descripción de la acción
    descripcion: {
        type: String,
        required: true
    },
    // Datos relacionados a la acción
    datosRelacionados: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    // Resultado de la acción
    resultado: {
        type: String,
        enum: ['exitoso', 'fallido', 'pendiente'],
        default: 'exitoso'
    },
    // Dirección IP del cliente
    direccionIP: {
        type: String,
        required: false
    },
    // Navegador/User Agent
    userAgent: {
        type: String,
        required: false
    },
    // Fecha de la acción
    fechaAccion: {
        type: Date,
        default: Date.now,
        index: true
    },
    // Tabla/Colección afectada
    tablaAfectada: {
        type: String,
        required: false
    },
    // Estado antes del cambio
    estadoAnterior: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    // Estado después del cambio
    estadoNuevo: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    // ID del objeto afectado (usuario, clasificación, etc)
    idObjeto: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
    collection: 'registros_auditoria'
});

// Índices para mejorar búsquedas
registroAuditoriaSchema.index({ idUsuario: 1, fechaAccion: -1 });
registroAuditoriaSchema.index({ tipoAccion: 1, fechaAccion: -1 });
registroAuditoriaSchema.index({ fechaAccion: -1 });

// Método estático para registrar una acción
registroAuditoriaSchema.statics.registrarAccion = async function(datos) {
    try {
        const registro = new this({
            idUsuario: datos.idUsuario,
            nombreUsuario: datos.nombreUsuario,
            tipoAccion: datos.tipoAccion,
            descripcion: datos.descripcion,
            datosRelacionados: datos.datosRelacionados || {},
            resultado: datos.resultado || 'exitoso',
            direccionIP: datos.direccionIP,
            userAgent: datos.userAgent,
            tablaAfectada: datos.tablaAfectada,
            estadoAnterior: datos.estadoAnterior,
            estadoNuevo: datos.estadoNuevo,
            idObjeto: datos.idObjeto
        });
        
        return await registro.save();
    } catch (error) {
        console.error('Error al registrar auditoría:', error);
        return null;
    }
};

// Método para obtener registros de un usuario
registroAuditoriaSchema.statics.obtenerRegistrosUsuario = async function(idUsuario, limite = 50) {
    return this.find({ idUsuario }).sort({ fechaAccion: -1 }).limit(limite);
};

// Método para obtener registros por tipo de acción
registroAuditoriaSchema.statics.obtenerRegistrosPorAccion = async function(tipoAccion, limite = 50) {
    return this.find({ tipoAccion }).sort({ fechaAccion: -1 }).limit(limite);
};

// Método para obtener estadísticas
registroAuditoriaSchema.statics.obtenerEstadisticas = async function(fechaInicio, fechaFin) {
    return this.aggregate([
        {
            $match: {
                fechaAccion: {
                    $gte: new Date(fechaInicio),
                    $lte: new Date(fechaFin)
                }
            }
        },
        {
            $group: {
                _id: '$tipoAccion',
                cantidad: { $sum: 1 },
                usuariosUnicos: { $addToSet: '$idUsuario' }
            }
        },
        {
            $sort: { cantidad: -1 }
        }
    ]);
};

module.exports = mongoose.model('RegistroAuditoria', registroAuditoriaSchema);
