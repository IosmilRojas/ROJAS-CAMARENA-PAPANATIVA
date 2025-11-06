// Controlador para gestión de historial de clasificaciones
const Clasificacion = require('../models/Clasificacion');
const Usuario = require('../models/Usuario');
const VariedadPapa = require('../models/VariedadPapa');
const Imagen = require('../models/Imagen');
const mongoose = require('mongoose');

/**
 * Mostrar historial de clasificaciones del usuario logueado
 */
const mostrarHistorial = async (req, res) => {
    try {
        // Verificar que el usuario esté logueado
        if (!req.session.usuario) {
            return res.redirect('/login');
        }

        const usuarioId = req.session.usuario.id;
        const usuarioObjectId = new mongoose.Types.ObjectId(usuarioId);
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // 10 clasificaciones por página
        const skip = (page - 1) * limit;

        // Obtener filtros de la query
        const filtros = { idUsuario: usuarioObjectId };
        
        if (req.query.variedad && req.query.variedad !== 'todas') {
            const variedad = await VariedadPapa.findOne({ nombreComun: req.query.variedad });
            if (variedad) {
                filtros.idVariedad = variedad._id;
            }
        }
        
        if (req.query.condicion && req.query.condicion !== 'todas') {
            filtros.condicion = req.query.condicion;
        }
        
        if (req.query.estado && req.query.estado !== 'todas') {
            filtros.estado = req.query.estado;
        }

        // Obtener clasificaciones con información relacionada
        const [clasificaciones, totalClasificaciones] = await Promise.all([
            Clasificacion.find(filtros)
                .populate('idVariedad', 'nombreComun nombreCientifico descripcion')
                .populate('idImagen', 'nombreArchivo rutaArchivo tamaño')
                .populate('validadoPor', 'nombre correo')
                .sort({ fechaClasificacion: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Clasificacion.countDocuments(filtros)
        ]);

        // Debug: Verificar usuario y consulta
        console.log(`📊 Calculando estadísticas para usuario: ${usuarioId}`);
        console.log(`📊 Usuario como ObjectId: ${usuarioObjectId}`);
        
        // Verificar cuántas clasificaciones hay para este usuario
        const conteoDebug = await Clasificacion.countDocuments({ idUsuario: usuarioObjectId });
        console.log(`📊 Clasificaciones encontradas para usuario: ${conteoDebug}`);

        // Calcular estadísticas del usuario
        const estadisticasUsuario = await Clasificacion.aggregate([
            { $match: { idUsuario: usuarioObjectId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    confianzaPromedio: { $avg: '$confianza' },
                    porVariedad: {
                        $push: {
                            variedad: '$idVariedad',
                            condicion: '$condicion',
                            confianza: '$confianza'
                        }
                    }
                }
            }
        ]);
        
        console.log(`📊 Estadísticas calculadas:`, estadisticasUsuario);

        // Obtener todas las variedades para el filtro
        const variedades = await VariedadPapa.find({ activa: true }).select('nombreComun').lean();

        // Calcular paginación
        const totalPages = Math.ceil(totalClasificaciones / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.render('historial', {
            titulo: 'Mi Historial de Clasificaciones - PAPACLICK',
            usuario: req.session.usuario,
            clasificaciones: clasificaciones,
            estadisticas: estadisticasUsuario[0] || { total: 0, confianzaPromedio: 0 },
            variedades: variedades,
            filtros: req.query,
            paginacion: {
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage,
                nextPage: hasNextPage ? page + 1 : null,
                prevPage: hasPrevPage ? page - 1 : null
            },
            totalClasificaciones: totalClasificaciones
        });

    } catch (error) {
        console.error('Error mostrando historial:', error);
        res.status(500).render('error', {
            titulo: 'Error - PAPACLICK',
            mensaje: 'Error al cargar el historial de clasificaciones',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

/**
 * API para obtener estadísticas rápidas del historial
 */
const obtenerEstadisticasRapidas = async (req, res) => {
    try {
        if (!req.session.usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const usuarioId = req.session.usuario.id;
        
        const estadisticas = await Clasificacion.aggregate([
            { $match: { idUsuario: usuarioId } },
            {
                $lookup: {
                    from: 'variedadespapas',
                    localField: 'idVariedad',
                    foreignField: '_id',
                    as: 'variedad'
                }
            },
            { $unwind: '$variedad' },
            {
                $group: {
                    _id: {
                        variedad: '$variedad.nombreComun',
                        condicion: '$condicion'
                    },
                    cantidad: { $sum: 1 },
                    confianzaPromedio: { $avg: '$confianza' }
                }
            },
            {
                $group: {
                    _id: '$_id.variedad',
                    condiciones: {
                        $push: {
                            condicion: '$_id.condicion',
                            cantidad: '$cantidad',
                            confianzaPromedio: '$confianzaPromedio'
                        }
                    },
                    total: { $sum: '$cantidad' }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json({
            success: true,
            estadisticas: estadisticas
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas rápidas:', error);
        res.status(500).json({ 
            error: 'Error al obtener estadísticas',
            message: error.message 
        });
    }
};

/**
 * Eliminar clasificación del historial (solo el propietario)
 */
const eliminarClasificacion = async (req, res) => {
    try {
        if (!req.session.usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const { id } = req.params;
        const usuarioId = req.session.usuario.id;

        // Verificar que la clasificación pertenezca al usuario
        const clasificacion = await Clasificacion.findOne({
            _id: id,
            idUsuario: usuarioId
        });

        if (!clasificacion) {
            return res.status(404).json({ error: 'Clasificación no encontrada' });
        }

        // Eliminar la clasificación
        await Clasificacion.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Clasificación eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando clasificación:', error);
        res.status(500).json({ 
            error: 'Error al eliminar clasificación',
            message: error.message 
        });
    }
};

module.exports = {
    mostrarHistorial,
    obtenerEstadisticasRapidas,
    eliminarClasificacion
};