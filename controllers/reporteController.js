// Controlador de Reportes - Maneja lógica de reportes y estadísticas
const Clasificacion = require('../models/Clasificacion');
const Usuario = require('../models/Usuario');
const VariedadPapa = require('../models/VariedadPapa');
const Trazabilidad = require('../models/Trazabilidad');
const moment = require('moment');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const ServicioAuditoria = require('../services/servicioAuditoria');

// Función para agregar watermark (marca de agua) a todas las páginas
function addWatermarkToDoc(doc) {
    try {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        // Centrado y diagonal, dentro de save/restore para no alterar el estado del doc
        const text = 'PapaIA';
        doc.save();
        doc.fillColor('#E8E8E8');
        doc.opacity(0.08);
        doc.font('Helvetica-Bold');
        doc.fontSize(80);

        const cx = pageWidth / 2;
        const cy = pageHeight / 2;
        doc.translate(cx, cy);
        doc.rotate(-45, { origin: [0, 0] });

        const textWidth = doc.widthOfString(text);
        doc.text(text, -textWidth / 2, -40, { align: 'center' });

        // Restaurar transformaciones y opacidad
        doc.rotate(45, { origin: [0, 0] });
        doc.translate(-cx, -cy);
        doc.opacity(1);
        doc.restore();
    } catch (error) {
        console.warn('Error añadiendo watermark:', error.message);
    }
}

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

            // Registrar en auditoría que se solicitó/visualizó un reporte
            try {
                await ServicioAuditoria.registrarGeneracionReporte(req, 'visualizar_reportes', filtros);
            } catch (auditErr) {
                console.warn('Advertencia: no se pudo registrar auditoría de visualización de reporte:', auditErr && auditErr.message);
            }
            
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
            
            // Construir datos del reporte con validaciones
            const datosReporte = clasificaciones
                .filter(cls => cls.idUsuario && cls.idVariedad && cls.idImagen) // Filtrar registros incompletos
                .map(cls => ({
                    idClasificacion: cls._id,
                    fecha: moment(cls.fechaClasificacion).format('DD/MM/YYYY HH:mm:ss'),
                    usuario: cls.idUsuario ? cls.idUsuario.nombre : 'Usuario no encontrado',
                    rol: cls.idUsuario ? cls.idUsuario.rol : 'N/A',
                    correoUsuario: cls.idUsuario ? cls.idUsuario.correo : 'N/A',
                    variedad: cls.idVariedad ? cls.idVariedad.nombreComun : 'Variedad no encontrada',
                    nombreCientifico: cls.idVariedad ? cls.idVariedad.nombreCientifico : 'N/A',
                    confianzaNumero: parseFloat((cls.confianza * 100).toFixed(2)),
                    confianza: (cls.confianza * 100).toFixed(2) + '%',
                    estado: cls.estado || 'N/A',
                    condicion: cls.condicion || 'N/A',
                    imagen: cls.idImagen ? cls.idImagen.nombreOriginal : 'Imagen no encontrada',
                    tiempoProcesamiento: cls.tiempoProcesamientoMs || 0,
                    tiempoProcesamintoMs: (cls.tiempoProcesamientoMs || 0) + 'ms',
                    observaciones: cls.observaciones || 'N/A'
                }));
            
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');

            // Registrar en auditoría que se generó un reporte y que se exportará
            try {
                await ServicioAuditoria.registrarGeneracionReporte(req, (req.query.formato || 'json'), filtros);
                await ServicioAuditoria.registrarExportacion(req, (req.query.formato || 'json'), datosReporte.length);
            } catch (auditErr) {
                console.warn('Advertencia: no se pudo registrar auditoría de exportación:', auditErr && auditErr.message);
            }
            
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
            
            // Calcular condiciones desde los datos
            let aptos = 0, noAptos = 0;
            datosReporte.forEach(d => {
                if (d.condicion === 'apto') aptos++;
                else noAptos++;
            });
            
            hojaSummary.addRows([
                { metrica: 'Total Clasificaciones', valor: estadisticas.general.totalClasificaciones },
                { metrica: 'Confianza Promedio', valor: (estadisticas.general.confianzaPromedio * 100).toFixed(2) + '%' },
                { metrica: 'Alta Confianza (≥80%)', valor: estadisticas.distribucionConfianza.alta || 0 },
                { metrica: 'Confianza Media (50-80%)', valor: estadisticas.distribucionConfianza.media || 0 },
                { metrica: 'Baja Confianza (<50%)', valor: estadisticas.distribucionConfianza.baja || 0 },
                { metrica: 'Papas Aptas', valor: aptos },
                { metrica: 'Papas No Aptas', valor: noAptos }
            ]);
            
            // Formatear encabezados del resumen
            hojaSummary.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2F5496' }
            };
            hojaSummary.getRow(1).font = {
                bold: true,
                color: { argb: 'FFFFFFFF' },
                size: 11
            };
            hojaSummary.getRow(1).alignment = { horizontal: 'center', vertical: 'center' };
            
            // Aplicar estilos al resumen
            hojaSummary.eachRow((row, rowNumber) => {
                row.eachCell((cell) => {
                    // Bordes
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                        left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                        bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                        right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
                    };
                    
                    if (rowNumber > 1) {
                        // Alternar colores de fila
                        if (rowNumber % 2 === 0) {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFF2F2F2' }
                            };
                        } else {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFFFFF' }
                            };
                        }
                    }
                    
                    // Alineación
                    cell.alignment = { horizontal: 'left', vertical: 'center' };
                    if (cell.value && typeof cell.value === 'number') {
                        cell.alignment = { horizontal: 'right', vertical: 'center' };
                    }
                });
            });
            
            // Hoja de detalle
            const hojaDetalle = workbook.addWorksheet('Clasificaciones');
            hojaDetalle.columns = [
                { header: 'Fecha', key: 'fecha', width: 18 },
                { header: 'Usuario', key: 'usuario', width: 15 },
                { header: 'Rol', key: 'rol', width: 14 },
                { header: 'Variedad', key: 'variedad', width: 14 },
                { header: 'Confianza (%)', key: 'confianzaNumero', width: 14 },
                { header: 'Condición', key: 'condicion', width: 12 },
                { header: 'Estado', key: 'estado', width: 12 },
                { header: 'Tiempo (ms)', key: 'tiempoProcesamiento', width: 12 }
            ];
            
            // Preparar datos para la hoja de detalle
            const datosParaExcel = datosReporte.map(d => ({
                ...d,
                confianzaNumero: parseFloat(d.confianzaNumero) || 0,
                tiempoProcesamiento: parseInt(d.tiempoProcesamiento) || 0
            }));
            
            hojaDetalle.addRows(datosParaExcel);
            
            // Formatear encabezados con colores atractivos
            hojaDetalle.views = [{ state: 'frozen', ySplit: 1 }];
            hojaDetalle.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2F5496' }
            };
            hojaDetalle.getRow(1).font = {
                bold: true,
                color: { argb: 'FFFFFFFF' },
                size: 11
            };
            hojaDetalle.getRow(1).alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
            
            // Formatear columnas de números
            hojaDetalle.getColumn('confianzaNumero').numFmt = '0.00';
            hojaDetalle.getColumn('tiempoProcesamiento').numFmt = '0';
            
            // Aplicar alineación y bordes a datos
            hojaDetalle.eachRow((row, rowNumber) => {
                row.eachCell((cell) => {
                    // Bordes
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                        left: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                        bottom: { style: 'thin', color: { argb: 'FFC0C0C0' } },
                        right: { style: 'thin', color: { argb: 'FFC0C0C0' } }
                    };
                    
                    // Centrar contenido
                    cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
                    
                    if (rowNumber > 1) {
                        // Alternar colores de fila
                        if (rowNumber % 2 === 0) {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFF2F2F2' }
                            };
                        }
                        
                        // Alinear números a la derecha
                        if (cell.value && (typeof cell.value === 'number')) {
                            cell.alignment = { horizontal: 'right', vertical: 'center' };
                        }
                    }
                });
            });
            
            // Ancho automático para columnas
            hojaDetalle.columns.forEach(col => {
                col.width = col.width || 15;
            });
            
            // Configurar respuesta
            const filename = `clasificaciones_${timestamp}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            
            await workbook.xlsx.write(res);
            res.end();
            console.log(`  📥 Archivo Excel generado: ${filename}`);
            
        } catch (error) {
            console.error('Error generando Excel:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error generando Excel: ' + error.message });
            }
        }
    }

    // Generar reporte en PDF
    static async generarPDF(datosReporte, estadisticas, usuario, timestamp, res) {
        try {
            const doc = new PDFDocument({
                bufferPages: true,
                margin: 50,
                size: 'A4'
            });
            
            const filename = `clasificaciones_${timestamp}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            
            doc.pipe(res);
            
            // Agregar watermark a la primera página
            addWatermarkToDoc(doc);
            
            // ========== ENCABEZADO CON LOGO ==========
            try {
                const logoPath = require('path').join(__dirname, '../public/assets/images/logo.jpg');
                doc.image(logoPath, 50, 30, { width: 80, height: 80 });
            } catch (error) {
                console.warn('Logo no encontrado:', error.message);
            }

            // Posicionar título y datos de forma dinámica para evitar solapamientos
            const headerX = 250;
            const headerWidth = 300; // ancho máximo para el bloque de texto del encabezado
            let currentY = 40;

            doc.fontSize(18).font('Helvetica-Bold');
            doc.text('Reporte de Clasificaciones de Papas', headerX, currentY, { width: headerWidth, align: 'left' });
            // avanzar currentY hasta la posición después del texto renderizado
            currentY = doc.y + 6;

            doc.fontSize(10).font('Helvetica').text(`Generado: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, headerX, currentY, { width: headerWidth, align: 'left' });
            currentY = doc.y + 2;

            doc.text(`Usuario: ${usuario.nombre} (${usuario.rol})`, headerX, currentY, { width: headerWidth, align: 'left' });

            // Línea separadora; asegurar que esté por debajo del bloque de encabezado
            const ruleY = Math.max(doc.y + 10, 130);
            doc.moveTo(50, ruleY).lineTo(545, ruleY).stroke();
            doc.y = ruleY + 10;
            
            // ========== RESUMEN DE ESTADÍSTICAS ==========
            doc.fontSize(12).font('Helvetica-Bold').text('Resumen de Estadísticas', { underline: true });
            doc.moveDown(0.2);
            
            // Calcular condiciones desde los datos
            let aptos = 0, noAptos = 0;
            datosReporte.forEach(d => {
                if (d.condicion === 'apto') aptos++;
                else noAptos++;
            });
            
            // Estadísticas en dos columnas
            const statsTop = doc.y;
            doc.fontSize(9).font('Helvetica');
            
            // Columna 1
            doc.text(`Total de Clasificaciones:`, 50);
            doc.fontSize(10).font('Helvetica-Bold').text(estadisticas.general.totalClasificaciones, 250);
            
            doc.fontSize(9).font('Helvetica');
            doc.text(`Confianza Promedio:`, 50);
            doc.fontSize(10).font('Helvetica-Bold').text(`${(estadisticas.general.confianzaPromedio * 100).toFixed(2)}%`, 250);
            
            doc.fontSize(9).font('Helvetica');
            doc.text(`Papas Aptas:`, 50);
            doc.fontSize(10).font('Helvetica-Bold').text(aptos, 250);
            
            doc.fontSize(9).font('Helvetica');
            doc.text(`Papas No Aptas:`, 50);
            doc.fontSize(10).font('Helvetica-Bold').text(noAptos, 250);
            
            doc.moveDown(0.5);
            
            // ========== TABLA DE DETALLES ==========
            doc.fontSize(12).font('Helvetica-Bold').text('Detalle de Clasificaciones', { underline: true });
            doc.moveDown(0.3);
            
            // Encabezados de tabla
            const tableTop = doc.y;
            const colWidths = {
                fecha: 65,
                usuario: 60,
                rol: 55,
                variedad: 60,
                confianza: 55,
                condicion: 55,
                estado: 50
            };
            
            const columns = {
                fecha: 50,
                usuario: 50 + colWidths.fecha + 3,
                rol: 50 + colWidths.fecha + colWidths.usuario + 6,
                variedad: 50 + colWidths.fecha + colWidths.usuario + colWidths.rol + 9,
                confianza: 50 + colWidths.fecha + colWidths.usuario + colWidths.rol + colWidths.variedad + 12,
                condicion: 50 + colWidths.fecha + colWidths.usuario + colWidths.rol + colWidths.variedad + colWidths.confianza + 15,
                estado: 50 + colWidths.fecha + colWidths.usuario + colWidths.rol + colWidths.variedad + colWidths.confianza + colWidths.condicion + 18
            };
            
            // Fondo azul oscuro para encabezado
            doc.rect(45, tableTop, 510, 20).fill('#2F5496');
            
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
            doc.text('Fecha', columns.fecha, tableTop + 5, { width: colWidths.fecha });
            doc.text('Usuario', columns.usuario, tableTop + 5, { width: colWidths.usuario });
            doc.text('Rol', columns.rol, tableTop + 5, { width: colWidths.rol });
            doc.text('Variedad', columns.variedad, tableTop + 5, { width: colWidths.variedad });
            doc.text('Confianza', columns.confianza, tableTop + 5, { width: colWidths.confianza });
            doc.text('Condición', columns.condicion, tableTop + 5, { width: colWidths.condicion });
            doc.text('Estado', columns.estado, tableTop + 5, { width: colWidths.estado });
            
            // Línea separadora bajo encabezado
            doc.moveTo(45, tableTop + 20).lineTo(555, tableTop + 20).stroke();
            
            // Datos de tabla
            let y = tableTop + 25;
            doc.font('Helvetica').fontSize(8).fillColor('#000000');
            
            datosReporte.forEach((clasificacion, index) => {
                // Verificar si necesita nueva página
                if (y > doc.page.height - 80) {
                    doc.addPage();
                    addWatermarkToDoc(doc);
                    
                    // Repetir encabezado en nueva página
                    const newTableTop = 50;
                    doc.rect(45, newTableTop, 510, 20).fill('#2F5496');
                    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
                    doc.text('Fecha', columns.fecha, newTableTop + 5, { width: colWidths.fecha });
                    doc.text('Usuario', columns.usuario, newTableTop + 5, { width: colWidths.usuario });
                    doc.text('Rol', columns.rol, newTableTop + 5, { width: colWidths.rol });
                    doc.text('Variedad', columns.variedad, newTableTop + 5, { width: colWidths.variedad });
                    doc.text('Confianza', columns.confianza, newTableTop + 5, { width: colWidths.confianza });
                    doc.text('Condición', columns.condicion, newTableTop + 5, { width: colWidths.condicion });
                    doc.text('Estado', columns.estado, newTableTop + 5, { width: colWidths.estado });
                    doc.moveTo(45, newTableTop + 20).lineTo(555, newTableTop + 20).stroke();
                    
                    y = newTableTop + 25;
                }
                
                // Alternar colores de fila
                if (index % 2 === 0) {
                    doc.rect(45, y - 2, 510, 12).fill('#ffffff');
                } else {
                    doc.rect(45, y - 2, 510, 12).fill('#f9f9f9');
                }
                
                doc.fontSize(8).font('Helvetica').fillColor('#000000');
                doc.text((clasificacion.fecha || '').substring(0, 15), columns.fecha, y, { width: colWidths.fecha });
                doc.text((clasificacion.usuario || '').substring(0, 12), columns.usuario, y, { width: colWidths.usuario });
                doc.text((clasificacion.rol || '').substring(0, 10), columns.rol, y, { width: colWidths.rol });
                doc.text((clasificacion.variedad || '').substring(0, 12), columns.variedad, y, { width: colWidths.variedad });
                doc.text(clasificacion.confianza || '', columns.confianza, y, { width: colWidths.confianza });
                doc.text((clasificacion.condicion || '').substring(0, 12), columns.condicion, y, { width: colWidths.condicion });
                doc.text(clasificacion.estado || '', columns.estado, y, { width: colWidths.estado });
                
                y += 12;
            });
            
            // Línea final de tabla
            doc.moveTo(45, y).lineTo(555, y).stroke();
            
            doc.moveDown(0.5);
            
            // ========== PIE DE PÁGINA ==========
            doc.moveTo(50, doc.page.height - 50).lineTo(545, doc.page.height - 50).stroke();
            
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            doc.text(`Total de registros: ${datosReporte.length}`, 50, doc.page.height - 45);
            doc.text(`Sistema de Clasificación de Papas - ${moment().format('DD/MM/YYYY HH:mm:ss')}`, 300, doc.page.height - 45, { align: 'right' });
            
            doc.end();
            
            console.log(`  📥 Archivo PDF generado: ${filename}`);
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error generando PDF: ' + error.message });
            }
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
    
    // ========================================
    // NUEVO: Obtener tendencia temporal con filtros
    // ========================================
    /**
     * POST /reportes/api/tendencia-temporal
     * Obtiene la tendencia temporal de los últimos 30 días con filtros aplicados
     * El último día es siempre hoy
     */
    static async obtenerTendenciaTemporalFiltrada(req, res) {
        try {
            // Verificar autenticación
            if (!req.session.usuario) {
                return res.status(401).json({
                    exito: false,
                    error: 'No autenticado'
                });
            }
            
            const { fechaInicio, fechaFin, variedad, condicion } = req.body;
            const idUsuario = req.session.usuario._id;
            const rolUsuario = req.session.usuario.rol;
            
            // ===== CONSTRUIR FILTRO DE CONSULTA =====
            let filtro = {};
            
            // Filtro por fecha
            if (fechaInicio || fechaFin) {
                filtro.fechaClasificacion = {};
                if (fechaInicio) {
                    filtro.fechaClasificacion.$gte = new Date(fechaInicio);
                }
                if (fechaFin) {
                    filtro.fechaClasificacion.$lte = new Date(fechaFin + 'T23:59:59.999Z');
                }
            } else {
                // Si no hay filtros de fecha, usar últimos 30 días dinámicamente
                const hoyTendencia = new Date();
                hoyTendencia.setHours(0, 0, 0, 0);
                
                const hace30DiasTendencia = new Date(hoyTendencia);
                hace30DiasTendencia.setDate(hace30DiasTendencia.getDate() - 29);
                
                filtro.fechaClasificacion = {
                    $gte: hace30DiasTendencia,
                    $lt: new Date(hoyTendencia.getTime() + 86400000)
                };
            }
            
            // Filtro por variedad
            if (variedad && variedad !== '') {
                filtro.idVariedad = new mongoose.Types.ObjectId(variedad);
            }
            
            // Filtro por condición
            if (condicion && condicion !== '') {
                filtro.condicion = condicion.toLowerCase();
            }
            
            // ===== CONTROL DE PERMISOS POR ROL =====
            if (rolUsuario !== 'administrador') {
                filtro.idUsuario = idUsuario;
            }
            
            // ===== AGRUPAR POR DÍA =====
            const tendenciaTemporal = await Clasificacion.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$fechaClasificacion'
                            }
                        },
                        cantidad: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            // Asegurar que haya 30 días en el array
            const hoyTendencia = new Date();
            hoyTendencia.setHours(0, 0, 0, 0);
            
            const hace30DiasTendencia = new Date(hoyTendencia);
            hace30DiasTendencia.setDate(hace30DiasTendencia.getDate() - 29);
            
            const datosTemporales = [];
            let fechaActual = new Date(hace30DiasTendencia);
            for (let i = 0; i < 30; i++) {
                const fechaStr = fechaActual.toISOString().split('T')[0];
                const registro = tendenciaTemporal.find(t => t._id === fechaStr);
                datosTemporales.push({
                    fecha: fechaStr,
                    cantidad: registro ? registro.cantidad : 0
                });
                fechaActual.setDate(fechaActual.getDate() + 1);
            }
            
            // ===== RETORNAR RESPUESTA =====
            res.json({
                exito: true,
                datosTemporales: datosTemporales
            });
            
        } catch (error) {
            console.error('[Error] Obtener tendencia temporal filtrada:', error.message);
            res.status(500).json({
                exito: false,
                error: error.message
            });
        }
    }

    // NUEVO: Filtrar datos del dashboard
    // ========================================
    /**
     * POST /reportes/filtrar
     * Obtiene datos filtrados respetando permisos por rol
     * 
     * Body:
     * {
     *   fechaInicio: "2024-10-01",
     *   fechaFin: "2024-11-11",
     *   variedad: "ID_VARIEDAD" o "",
     *   condicion: "apto", "no apto" o ""
     * }
     * 
     * Admin: Ve todos los datos
     * Otros roles: Solo ven sus propias clasificaciones
     */
    static async filtrarDashboard(req, res) {
        try {
            // Verificar autenticación
            if (!req.session.usuario) {
                return res.status(401).json({
                    exito: false,
                    error: 'No autenticado'
                });
            }
            
            const { fechaInicio, fechaFin, variedad, condicion } = req.body;
            const idUsuario = req.session.usuario._id;
            const rolUsuario = req.session.usuario.rol;
            
            console.log('[Filtros] Solicitud de filtrado:', {
                usuario: req.session.usuario.nombre,
                rol: rolUsuario,
                filtros: { fechaInicio, fechaFin, variedad, condicion }
            });
            
            // ===== CONSTRUIR FILTRO DE CONSULTA =====
            let filtro = {};
            
            // Filtro por fecha
            if (fechaInicio || fechaFin) {
                filtro.fechaClasificacion = {};
                if (fechaInicio) {
                    filtro.fechaClasificacion.$gte = new Date(fechaInicio);
                }
                if (fechaFin) {
                    filtro.fechaClasificacion.$lte = new Date(fechaFin + 'T23:59:59.999Z');
                }
            }
            
            // Filtro por variedad
            if (variedad && variedad !== '') {
                filtro.idVariedad = new mongoose.Types.ObjectId(variedad);
            }
            
            // Filtro por condición
            if (condicion && condicion !== '') {
                filtro.condicion = condicion.toLowerCase();
            }
            
            // ===== CONTROL DE PERMISOS POR ROL =====
            // Solo administrador puede ver datos de otros usuarios
            if (rolUsuario !== 'administrador') {
                filtro.idUsuario = idUsuario;
                console.log('[Filtros] Usuario no-admin filtrado por su ID:', idUsuario);
            }
            
            // ===== OBTENER CLASIFICACIONES FILTRADAS =====
            const clasificaciones = await Clasificacion.find(filtro)
                .populate('idVariedad', 'nombreComun')
                .populate('idUsuario', 'nombre email rol')
                .sort({ fechaClasificacion: -1 })
                .lean();
            
            console.log('[Filtros] Clasificaciones encontradas:', clasificaciones.length);
            
            // ===== CALCULAR ESTADÍSTICAS FILTRADAS =====
            const estadisticas = await Clasificacion.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        aptos: {
                            $sum: {
                                $cond: [{ $eq: ['$condicion', 'apto'] }, 1, 0]
                            }
                        },
                        noAptos: {
                            $sum: {
                                $cond: [{ $eq: ['$condicion', 'no apto'] }, 1, 0]
                            }
                        },
                        confianzaPromedio: { $avg: '$confianza' }
                    }
                }
            ]);
            
            const stats = estadisticas[0] || {
                total: 0,
                aptos: 0,
                noAptos: 0,
                confianzaPromedio: 0
            };
            
            console.log('[Filtros] Estadísticas calculadas:', stats);
            
            // ===== AGRUPAR POR VARIEDAD =====
            const porVariedad = await Clasificacion.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: '$idVariedad',
                        cantidad: { $sum: 1 },
                        confianzaPromedio: { $avg: '$confianza' }
                    }
                },
                {
                    $lookup: {
                        from: 'variedadpapas',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'variedad'
                    }
                },
                {
                    $unwind: {
                        path: '$variedad',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { cantidad: -1 }
                }
            ]);
            
            // ===== OBTENER TODAS LAS VARIEDADES ACTIVAS =====
            const todasLasVariedades = await VariedadPapa.find({ activa: true }).lean();
            
            // ===== MAPEAR DATOS Y ASEGURAR QUE TODAS LAS VARIEDADES SE MUESTREN =====
            const datosVariedad = todasLasVariedades.map(variedad => {
                const datosEncontrados = porVariedad.find(item => item._id?.toString() === variedad._id?.toString());
                return {
                    _id: variedad._id,
                    nombreComun: variedad.nombreComun || 'Sin nombre',
                    cantidad: datosEncontrados ? datosEncontrados.cantidad : 0,
                    confianzaPromedio: datosEncontrados ? datosEncontrados.confianzaPromedio : 0,
                    porcentaje: stats.total > 0 ? ((( datosEncontrados ? datosEncontrados.cantidad : 0) / stats.total) * 100).toFixed(1) : 0
                };
            }).sort((a, b) => b.cantidad - a.cantidad);
            
            console.log('[Filtros] Datos por variedad:', datosVariedad.length);
            
            // ===== AGRUPAR POR CONDICIÓN =====
            const porCondicion = await Clasificacion.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: '$condicion',
                        cantidad: { $sum: 1 }
                    }
                }
            ]);
            
            // ===== TENDENCIA TEMPORAL (ÚLTIMOS 30 DÍAS, DINÁMICO) =====
            const hoyTendencia = new Date();
            hoyTendencia.setHours(0, 0, 0, 0);
            
            const hace30DiasTendencia = new Date(hoyTendencia);
            hace30DiasTendencia.setDate(hace30DiasTendencia.getDate() - 29);
            
            const tendenciaTemporal = await Clasificacion.aggregate([
                {
                    $match: {
                        ...filtro,
                        fechaClasificacion: { $gte: hace30DiasTendencia, $lt: new Date(hoyTendencia.getTime() + 86400000) }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$fechaClasificacion'
                            }
                        },
                        cantidad: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            // Asegurar que haya 30 días en el array
            const datosTemporales = [];
            let fechaActual = new Date(hace30DiasTendencia);
            for (let i = 0; i < 30; i++) {
                const fechaStr = fechaActual.toISOString().split('T')[0];
                const registro = tendenciaTemporal.find(t => t._id === fechaStr);
                datosTemporales.push({
                    fecha: fechaStr,
                    cantidad: registro ? registro.cantidad : 0
                });
                fechaActual.setDate(fechaActual.getDate() + 1);
            }
            
            // ===== DISTRIBUCIÓN DE CONFIANZA =====
            const datosConfianza = await Clasificacion.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: null,
                        rango90_100: {
                            $sum: { $cond: [{ $gte: ['$confianza', 0.9] }, 1, 0] }
                        },
                        rango80_90: {
                            $sum: { $cond: [
                                { $and: [{ $gte: ['$confianza', 0.8] }, { $lt: ['$confianza', 0.9] }] },
                                1, 0
                            ] }
                        },
                        rango70_80: {
                            $sum: { $cond: [
                                { $and: [{ $gte: ['$confianza', 0.7] }, { $lt: ['$confianza', 0.8] }] },
                                1, 0
                            ] }
                        },
                        rango60_70: {
                            $sum: { $cond: [
                                { $and: [{ $gte: ['$confianza', 0.6] }, { $lt: ['$confianza', 0.7] }] },
                                1, 0
                            ] }
                        },
                        rangoMenor60: {
                            $sum: { $cond: [{ $lt: ['$confianza', 0.6] }, 1, 0] }
                        }
                    }
                }
            ]);
            
            const distribucionConfianza = datosConfianza.length > 0 ? datosConfianza[0] : {
                rango90_100: 0,
                rango80_90: 0,
                rango70_80: 0,
                rango60_70: 0,
                rangoMenor60: 0
            };
            
            // ===== RETORNAR RESPUESTA =====
            res.json({
                exito: true,
                clasificaciones: clasificaciones,
                estadisticas: {
                    total: stats.total,
                    aptos: stats.aptos,
                    noAptos: stats.noAptos,
                    confianzaPromedio: parseFloat(stats.confianzaPromedio.toFixed(2))
                },
                porVariedad: datosVariedad,
                porCondicion: porCondicion,
                datosTemporales: datosTemporales,
                distribucionConfianza: distribucionConfianza,
                filtrosAplicados: {
                    fechaInicio,
                    fechaFin,
                    variedad,
                    condicion
                }
            });
            
        } catch (error) {
            console.error('[Error] Filtrar dashboard:', error.message);
            res.status(500).json({
                exito: false,
                error: error.message
            });
        }
    }
}

module.exports = ReporteController;