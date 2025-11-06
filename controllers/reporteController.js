// Controlador de Reportes - Maneja lógica de reportes y estadísticas
const Clasificacion = require('../models/Clasificacion');
const Usuario = require('../models/Usuario');
const VariedadPapa = require('../models/VariedadPapa');
const Trazabilidad = require('../models/Trazabilidad');
const moment = require('moment');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

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

    // Exportar reporte a JSON, Excel o PDF
    static async exportarReporte(req, res) {
        try {
            if (!req.session.usuario) {
                return res.status(401).json({ error: 'No autenticado' });
            }
            
            const {
                fechaInicio,
                fechaFin,
                variedad,
                condicion,
                estado,
                formato = 'json'
            } = req.query;
            
            console.log(`📊 Iniciando exportación de clasificaciones en formato: ${formato}`);
            console.log('  Filtros:', { fechaInicio, fechaFin, variedad });
            
            // Construir filtros
            const filtros = {};
            
            // Solo administrador puede ver todas las clasificaciones
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
            
            if (condicion) {
                filtros.condicion = condicion;
            }
            
            if (estado) {
                filtros.estado = estado;
            }
            
            console.log('  Filtros aplicados:', filtros);
            
            // Obtener TODAS las clasificaciones sin límite
            const clasificaciones = await Clasificacion.find(filtros)
                .populate('idUsuario', 'nombre correo rol')
                .populate('idImagen', 'urlImagen nombreOriginal fechaSubida')
                .populate('idVariedad', 'nombreComun nombreCientifico descripcion')
                .sort({ fechaClasificacion: -1 });
            
            console.log(`  ✅ Se encontraron ${clasificaciones.length} clasificaciones`);
            
            // Calcular estadísticas
            const estadisticas = await ReporteController.calcularEstadisticas(filtros);
            
            // Construir datos del reporte
            const datosReporte = clasificaciones.map(cls => ({
                idClasificacion: cls._id,
                fecha: moment(cls.fechaClasificacion).format('DD/MM/YYYY HH:mm:ss'),
                usuario: cls.idUsuario.nombre,
                correoUsuario: cls.idUsuario.correo,
                variedad: cls.idVariedad.nombreComun,
                nombreCientifico: cls.idVariedad.nombreCientifico,
                confianza: (cls.confianza * 100).toFixed(2) + '%',
                estado: cls.estado,
                condicion: cls.condicion,
                imagen: cls.idImagen.nombreOriginal,
                tiempoProcesamiento: cls.tiempoProcesamientoMs + 'ms',
                observaciones: cls.observaciones || 'N/A'
            }));
            
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            
            // Generar según formato
            switch(formato.toLowerCase()) {
                case 'excel':
                    return ReporteController.generarExcel(datosReporte, estadisticas, timestamp, res);
                case 'pdf':
                    return ReporteController.generarPDF(datosReporte, estadisticas, req.session.usuario, timestamp, res);
                default:
                    return ReporteController.generarJSON(datosReporte, estadisticas, timestamp, res, req.session.usuario);
            }
            
        } catch (error) {
            console.error('❌ Error exportando reporte:', error);
            res.status(500).json({ 
                success: false,
                error: 'Error exportando reporte',
                mensaje: error.message
            });
        }
    }

    // Generar reporte en Excel
    static async generarExcel(datosReporte, estadisticas, timestamp, res) {
        try {
            const workbook = new ExcelJS.Workbook();
            
            // Hoja de resumen
            const hojaSummary = workbook.addWorksheet('Resumen');
            hojaSummary.columns = [
                { header: 'Métrica', key: 'metrica', width: 30 },
                { header: 'Valor', key: 'valor', width: 20 }
            ];
            
            hojaSummary.addRows([
                { metrica: 'Total Clasificaciones', valor: estadisticas.general.totalClasificaciones },
                { metrica: 'Confianza Promedio', valor: (estadisticas.general.confianzaPromedio * 100).toFixed(2) + '%' },
                { metrica: 'Alta Confianza (≥80%)', valor: estadisticas.distribucionConfianza.alta },
                { metrica: 'Confianza Media (50-80%)', valor: estadisticas.distribucionConfianza.media },
                { metrica: 'Baja Confianza (<50%)', valor: estadisticas.distribucionConfianza.baja },
                { metrica: 'Papas Aptas', valor: estadisticas.condiciones.apto },
                { metrica: 'Papas No Aptas', valor: estadisticas.condiciones.noApto }
            ]);
            
            // Aplicar estilos al resumen
            hojaSummary.rows.forEach(row => {
                row.cells.forEach(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE0E0E0' }
                    };
                });
            });
            
            // Hoja de detalle
            const hojaDetalle = workbook.addWorksheet('Clasificaciones');
            hojaDetalle.columns = [
                { header: 'Fecha', key: 'fecha', width: 18 },
                { header: 'Usuario', key: 'usuario', width: 15 },
                { header: 'Variedad', key: 'variedad', width: 15 },
                { header: 'Confianza', key: 'confianza', width: 12 },
                { header: 'Condición', key: 'condicion', width: 12 },
                { header: 'Estado', key: 'estado', width: 12 },
                { header: 'Imagen', key: 'imagen', width: 20 },
                { header: 'Tiempo (ms)', key: 'tiempoProcesamiento', width: 12 }
            ];
            
            hojaDetalle.addRows(datosReporte);
            
            // Formatear encabezados
            hojaDetalle.views = [{ state: 'frozen', ySplit: 1 }];
            hojaDetalle.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            hojaDetalle.getRow(1).font = {
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            
            // Configurar respuesta
            const filename = `clasificaciones_${timestamp}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            await workbook.xlsx.write(res);
            console.log(`  📥 Archivo Excel generado: ${filename}`);
            
        } catch (error) {
            console.error('Error generando Excel:', error);
            throw error;
        }
    }

    // Generar reporte en PDF
    static async generarPDF(datosReporte, estadisticas, usuario, timestamp, res) {
        try {
            const doc = new PDFDocument({
                bufferPages: true,
                margin: 40
            });
            
            const filename = `clasificaciones_${timestamp}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            doc.pipe(res);
            
            // Encabezado
            doc.fontSize(20).font('Helvetica-Bold').text('Reporte de Clasificaciones de Papas', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(`Generado: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, { align: 'center' });
            doc.fontSize(10).text(`Usuario: ${usuario.nombre}`, { align: 'center' });
            doc.moveDown(0.5);
            
            // Resumen de estadísticas
            doc.fontSize(12).font('Helvetica-Bold').text('Resumen de Estadísticas', { underline: true });
            doc.fontSize(10).font('Helvetica');
            doc.text(`Total de Clasificaciones: ${estadisticas.general.totalClasificaciones}`);
            doc.text(`Confianza Promedio: ${(estadisticas.general.confianzaPromedio * 100).toFixed(2)}%`);
            doc.text(`Papas Aptas: ${estadisticas.condiciones.apto}`);
            doc.text(`Papas No Aptas: ${estadisticas.condiciones.noApto}`);
            doc.moveDown(0.5);
            
            // Tabla de detalles
            doc.fontSize(12).font('Helvetica-Bold').text('Detalle de Clasificaciones', { underline: true });
            doc.moveDown(0.3);
            
            // Encabezado de tabla
            const tableTop = doc.y;
            const col1 = 50;
            const col2 = 120;
            const col3 = 200;
            const col4 = 280;
            const col5 = 360;
            const col6 = 440;
            
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Fecha', col1, tableTop);
            doc.text('Usuario', col2, tableTop);
            doc.text('Variedad', col3, tableTop);
            doc.text('Confianza', col4, tableTop);
            doc.text('Condición', col5, tableTop);
            doc.text('Estado', col6, tableTop);
            
            // Línea separadora
            doc.moveTo(40, tableTop + 15).lineTo(570, tableTop + 15).stroke();
            
            // Datos de tabla
            let y = tableTop + 20;
            doc.font('Helvetica').fontSize(8);
            
            datosReporte.forEach((clasificacion, index) => {
                if (y > doc.page.height - 60) {
                    doc.addPage();
                    y = 50;
                }
                
                doc.text(clasificacion.fecha, col1, y);
                doc.text(clasificacion.usuario.substring(0, 15), col2, y);
                doc.text(clasificacion.variedad.substring(0, 12), col3, y);
                doc.text(clasificacion.confianza, col4, y);
                doc.text(clasificacion.condicion, col5, y);
                doc.text(clasificacion.estado, col6, y);
                
                y += 15;
            });
            
            // Pie de página
            doc.fontSize(8).text(`Total de registros: ${datosReporte.length}`, 40, doc.page.height - 30);
            
            doc.end();
            
            console.log(`  📥 Archivo PDF generado: ${filename}`);
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            throw error;
        }
    }

    // Generar reporte en JSON
    static async generarJSON(datosReporte, estadisticas, timestamp, res, usuario) {
        try {
            const reporte = {
                metadatos: {
                    fechaGeneracion: moment().toISOString(),
                    usuarioSolicitante: usuario.nombre,
                    rolUsuario: usuario.rol,
                    totalRegistros: datosReporte.length
                },
                estadisticas,
                clasificaciones: datosReporte
            };
            
            const filename = `clasificaciones_${timestamp}.json`;
            
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            console.log(`  📥 Archivo JSON generado: ${filename}`);
            
            res.json(reporte);
            
        } catch (error) {
            console.error('Error generando JSON:', error);
            throw error;
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