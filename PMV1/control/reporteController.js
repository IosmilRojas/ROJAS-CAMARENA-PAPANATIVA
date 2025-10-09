// Controlador de Reportes - Maneja lógica de reportes y estadísticas
const Clasificacion = require('../modelo/Clasificacion');
const Usuario = require('../modelo/Usuario');
const VariedadPapa = require('../modelo/VariedadPapa');
const Trazabilidad = require('../modelo/Trazabilidad');
const moment = require('moment');
const mongoose = require('mongoose');

class ReporteController {
    
    // Mostrar página de reportes
    static async mostrarReportes(req, res) {
        try {
            // Verificar autenticación
            if (!req.session.usuario) {
                return res.redirect('/login');
            }
            
            // Obtener filtros de query parameters
            const {
                fechaInicio,
                fechaFin,
                variedad,
                usuario: usuarioFiltro,
                estado,
                condicion
            } = req.query;
            
            // Construir filtros para la consulta
            const filtros = {};
            
            // Filtro por usuario (solo si es administrador puede ver otros usuarios)
            if (req.session.usuario.rol === 'administrador') {
                if (usuarioFiltro) {
                    filtros.idUsuario = new mongoose.Types.ObjectId(usuarioFiltro);
                }
            } else {
                filtros.idUsuario = new mongoose.Types.ObjectId(req.session.usuario.id);
            }
            
            // Filtro por fechas
            if (fechaInicio || fechaFin) {
                filtros.fechaClasificacion = {};
                if (fechaInicio) {
                    filtros.fechaClasificacion.$gte = new Date(fechaInicio);
                }
                if (fechaFin) {
                    filtros.fechaClasificacion.$lte = new Date(fechaFin + 'T23:59:59.999Z');
                }
            }
            
            // Filtro por variedad
            if (variedad) {
                filtros.idVariedad = variedad;
            }
            
            // Filtro por estado
            if (estado) {
                filtros.estado = estado;
            }
            
            // Filtro por condición
            if (condicion) {
                filtros.condicion = condicion;
            }
            
            // Obtener clasificaciones
            const clasificaciones = await Clasificacion.find(filtros)
                .populate('idUsuario', 'nombre correo')
                .populate('idImagen', 'urlImagen nombreOriginal')
                .populate('idVariedad', 'nombreComun nombreCientifico')
                .sort({ fechaClasificacion: -1 })
                .limit(100);
            
            // Obtener datos para filtros
            const usuarios = req.session.usuario.rol === 'administrador' 
                ? await Usuario.find({ activo: true }, 'nombre correo')
                : [];
                
            const variedades = await VariedadPapa.obtenerActivas();
            
            // Calcular estadísticas básicas
            const estadisticas = await ReporteController.calcularEstadisticas(filtros);
            
            res.render('reportes', {
                titulo: 'Reportes - Sistema de Clasificación',
                usuario: req.session.usuario,
                clasificaciones,
                usuarios,
                variedades,
                estadisticas,
                filtros: req.query,
                moment
            });
            
        } catch (error) {
            console.error('Error mostrando reportes:', error);
            res.status(500).render('error', {
                mensaje: 'Error cargando reportes',
                codigo: 500
            });
        }
    }

    // Obtener estadísticas generales
    static async obtenerEstadisticas(req, res) {
        try {
            if (!req.session.usuario) {
                return res.status(401).json({ error: 'No autenticado' });
            }
            
            // Filtros base según rol del usuario
            const filtrosBase = {};
            if (req.session.usuario.rol !== 'administrador') {
                filtrosBase.idUsuario = new mongoose.Types.ObjectId(req.session.usuario.id);
            }
            
            const estadisticas = await ReporteController.calcularEstadisticas(filtrosBase);
            
            res.json(estadisticas);
            
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({ error: 'Error obteniendo estadísticas' });
        }
    }

    // Calcular estadísticas detalladas
    static async calcularEstadisticas(filtros = {}) {
        try {
            // Estadísticas generales
            const totalClasificaciones = await Clasificacion.countDocuments(filtros);
            
            // Estadísticas por variedad
            const porVariedad = await Clasificacion.aggregate([
                { $match: filtros },
                {
                    $lookup: {
                        from: 'variedades_papa',
                        localField: 'idVariedad',
                        foreignField: '_id',
                        as: 'variedad'
                    }
                },
                { $unwind: '$variedad' },
                {
                    $group: {
                        _id: '$variedad.nombreComun',
                        total: { $sum: 1 },
                        confianzaPromedio: { $avg: '$confianza' }
                    }
                },
                { $sort: { total: -1 } }
            ]);
            
            // Estadísticas por usuario (solo para administradores)
            const porUsuario = await Clasificacion.aggregate([
                { $match: filtros },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'idUsuario',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                { $unwind: '$usuario' },
                {
                    $group: {
                        _id: '$usuario.nombre',
                        total: { $sum: 1 },
                        confianzaPromedio: { $avg: '$confianza' }
                    }
                },
                { $sort: { total: -1 } }
            ]);
            
            // Estadísticas por día (últimos 30 días)
            const hace30Dias = new Date();
            hace30Dias.setDate(hace30Dias.getDate() - 30);
            
            const porDia = await Clasificacion.aggregate([
                { 
                    $match: { 
                        ...filtros,
                        fechaClasificacion: { $gte: hace30Dias }
                    }
                },
                {
                    $group: {
                        _id: { 
                            $dateToString: { 
                                format: "%Y-%m-%d", 
                                date: "$fechaClasificacion" 
                            }
                        },
                        total: { $sum: 1 },
                        confianzaPromedio: { $avg: '$confianza' }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            // Estadísticas de confianza
            const estadisticasConfianza = await Clasificacion.aggregate([
                { $match: filtros },
                {
                    $group: {
                        _id: null,
                        confianzaPromedio: { $avg: '$confianza' },
                        confianzaMaxima: { $max: '$confianza' },
                        confianzaMinima: { $min: '$confianza' },
                        altaConfianza: { 
                            $sum: { $cond: [{ $gte: ['$confianza', 0.8] }, 1, 0] }
                        },
                        mediaConfianza: { 
                            $sum: { 
                                $cond: [
                                    { $and: [
                                        { $gte: ['$confianza', 0.5] },
                                        { $lt: ['$confianza', 0.8] }
                                    ]}, 
                                    1, 0
                                ]
                            }
                        },
                        bajaConfianza: { 
                            $sum: { $cond: [{ $lt: ['$confianza', 0.5] }, 1, 0] }
                        }
                    }
                }
            ]);
            
            const confianza = estadisticasConfianza[0] || {
                confianzaPromedio: 0,
                confianzaMaxima: 0,
                confianzaMinima: 0,
                altaConfianza: 0,
                mediaConfianza: 0,
                bajaConfianza: 0
            };
            
            // Estadísticas por condición (apto/no apto)
            const porCondicion = await Clasificacion.aggregate([
                { $match: filtros },
                {
                    $group: {
                        _id: '$condicion',
                        total: { $sum: 1 },
                        confianzaPromedio: { $avg: '$confianza' }
                    }
                },
                { $sort: { total: -1 } }
            ]);
            
            // Estadísticas por variedad y condición combinadas
            const porVariedadYCondicion = await Clasificacion.aggregate([
                { $match: filtros },
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
                            variedad: '$variedad.nombre',
                            condicion: '$condicion'
                        },
                        total: { $sum: 1 },
                        confianzaPromedio: { $avg: '$confianza' }
                    }
                },
                { $sort: { '_id.variedad': 1, '_id.condicion': 1 } }
            ]);

            return {
                general: {
                    totalClasificaciones,
                    confianzaPromedio: confianza.confianzaPromedio,
                    confianzaMaxima: confianza.confianzaMaxima,
                    confianzaMinima: confianza.confianzaMinima
                },
                distribucionConfianza: {
                    alta: confianza.altaConfianza,
                    media: confianza.mediaConfianza,
                    baja: confianza.bajaConfianza
                },
                porVariedad,
                porUsuario,
                porDia,
                porCondicion,
                porVariedadYCondicion
            };
            
        } catch (error) {
            console.error('Error calculando estadísticas:', error);
            throw error;
        }
    }

    // Exportar reporte a JSON
    static async exportarReporte(req, res) {
        try {
            if (!req.session.usuario) {
                return res.status(401).json({ error: 'No autenticado' });
            }
            
            const {
                fechaInicio,
                fechaFin,
                variedad,
                formato = 'json'
            } = req.query;
            
            // Construir filtros
            const filtros = {};
            
            if (req.session.usuario.rol !== 'administrador') {
                filtros.idUsuario = new mongoose.Types.ObjectId(req.session.usuario.id);
            }
            
            if (fechaInicio || fechaFin) {
                filtros.fechaClasificacion = {};
                if (fechaInicio) {
                    filtros.fechaClasificacion.$gte = new Date(fechaInicio);
                }
                if (fechaFin) {
                    filtros.fechaClasificacion.$lte = new Date(fechaFin + 'T23:59:59.999Z');
                }
            }
            
            if (variedad) {
                filtros.idVariedad = variedad;
            }
            
            // Obtener datos
            const clasificaciones = await Clasificacion.find(filtros)
                .populate('idUsuario', 'nombre correo')
                .populate('idImagen', 'urlImagen nombreOriginal fechaSubida')
                .populate('idVariedad', 'nombreComun nombreCientifico descripcion')
                .sort({ fechaClasificacion: -1 });
            
            const estadisticas = await ReporteController.calcularEstadisticas(filtros);
            
            const reporte = {
                metadatos: {
                    fechaGeneracion: new Date(),
                    usuarioSolicitante: req.session.usuario.nombre,
                    filtrosAplicados: req.query,
                    totalRegistros: clasificaciones.length
                },
                estadisticas,
                clasificaciones: clasificaciones.map(cls => ({
                    id: cls.idClasificacion,
                    fecha: cls.fechaClasificacion,
                    usuario: cls.idUsuario.nombre,
                    variedad: cls.idVariedad.nombreComun,
                    nombreCientifico: cls.idVariedad.nombreCientifico,
                    confianza: cls.confianza,
                    confianzaPorcentaje: cls.confianzaPorcentaje,
                    estado: cls.estado,
                    imagen: cls.idImagen.nombreOriginal,
                    tiempoProcesamiento: cls.tiempoProcesamientoMs
                }))
            };
            
            // Configurar headers para descarga
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const filename = `reporte_clasificaciones_${timestamp}.json`;
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            res.json(reporte);
            
        } catch (error) {
            console.error('Error exportando reporte:', error);
            res.status(500).json({ error: 'Error exportando reporte' });
        }
    }

    // Obtener trazabilidad de una clasificación
    static async obtenerTrazabilidad(req, res) {
        try {
            if (!req.session.usuario) {
                return res.status(401).json({ error: 'No autenticado' });
            }
            
            const { idClasificacion } = req.params;
            
            const clasificacion = await Clasificacion.findById(idClasificacion);
            
            if (!clasificacion) {
                return res.status(404).json({ error: 'Clasificación no encontrada' });
            }
            
            // Verificar permisos
            if (req.session.usuario.rol !== 'administrador' && 
                clasificacion.idUsuario.toString() !== req.session.usuario.id) {
                return res.status(403).json({ error: 'Sin permisos para ver esta trazabilidad' });
            }
            
            const trazabilidad = await Trazabilidad.obtenerHistorial(idClasificacion);
            
            res.json({ trazabilidad });
            
        } catch (error) {
            console.error('Error obteniendo trazabilidad:', error);
            res.status(500).json({ error: 'Error obteniendo trazabilidad' });
        }
    }
}

module.exports = ReporteController;