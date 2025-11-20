const RegistroAuditoria = require('../models/RegistroAuditoria');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const ServicioAuditoria = require('../services/servicioAuditoria');

class AuditoriaController {
    // Exportar registros de auditoría a PDF (solo administradores - enforced by route middleware)
    static async exportarAuditoriaPDF(req, res) {
        try {
            // Filtros opcionales
            const { fechaInicio, fechaFin, tipoAccion, idUsuario } = req.query;
            const filtros = {};

            if (fechaInicio || fechaFin) {
                filtros.fechaAccion = {};
                if (fechaInicio) filtros.fechaAccion.$gte = new Date(fechaInicio);
                if (fechaFin) filtros.fechaAccion.$lte = new Date(fechaFin + 'T23:59:59.999Z');
            }

            if (tipoAccion) filtros.tipoAccion = tipoAccion;
            if (idUsuario) filtros.idUsuario = idUsuario;

            const registros = await RegistroAuditoria.find(filtros).sort({ fechaAccion: -1 }).limit(2000);

            // PDF
            const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const filename = `auditoria_${timestamp}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            doc.pipe(res);

            // Header
            try {
                const logoPath = require('path').join(__dirname, '../public/assets/images/logo.jpg');
                doc.image(logoPath, 40, 30, { width: 60, height: 60 });
            } catch (err) {
                // ignore
            }
            let headerX = 110;
            let headerY = 40;
            const headerWidth = 420;

            // Título
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('Registros de Auditoría', headerX, headerY, { width: headerWidth });
            headerY = doc.y + 6;

            // Generado
            doc.fontSize(9).font('Helvetica').fillColor('#666').text(`Generado: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, headerX, headerY, { width: headerWidth });
            headerY = doc.y + 4;

            // Filtros aplicados
            const filtrosText = `Filtrado: ${tipoAccion || 'todos'} | ${fechaInicio || 'inicio'} → ${fechaFin || 'fin'}`;
            doc.fontSize(9).font('Helvetica').fillColor('#666').text(filtrosText, headerX, headerY, { width: headerWidth });
            headerY = doc.y + 4;

            // Quién exportó
            const exportadoPor = req.session?.usuario?.nombre || 'Sistema';
            doc.fontSize(9).font('Helvetica').fillColor('#333').text(`Exportado por: ${exportadoPor}`, headerX, headerY, { width: headerWidth });
            headerY = doc.y + 10;

            // Línea separadora
            doc.strokeColor('#000').lineWidth(0.8).moveTo(40, headerY).lineTo(555, headerY).stroke();
            doc.y = headerY + 10;

            // Table header (styled)
            const col = {
                fechaX: 40, fechaW: 110,
                usuarioX: 150, usuarioW: 120,
                accionX: 280, accionW: 90,
                descripcionX: 370, descripcionW: 175
            };

            const headerTop = doc.y;
            doc.rect(36, headerTop - 4, 523, 20).fill('#2F5496');
            doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
            doc.text('Fecha', col.fechaX, headerTop, { width: col.fechaW });
            doc.text('Usuario', col.usuarioX, headerTop, { width: col.usuarioW });
            doc.text('Acción', col.accionX, headerTop, { width: col.accionW });
            doc.text('Descripción', col.descripcionX, headerTop, { width: col.descripcionW });

            // Data rows
            doc.moveDown(0.8);
            doc.fillColor('#000').font('Helvetica').fontSize(8);
            let y = doc.y;

            for (let i = 0; i < registros.length; i++) {
                const r = registros[i];

                const fecha = r.fechaAccion ? moment(r.fechaAccion).format('DD/MM/YYYY HH:mm:ss') : '';
                const usuario = r.nombreUsuario || '';
                const accion = r.tipoAccion || '';
                const descripcion = (r.descripcion || '').replace(/\n/g, ' ');

                // Calcular altura necesaria para descripción y otras columnas
                const descHeight = doc.heightOfString(descripcion, { width: col.descripcionW });
                const usuarioH = doc.heightOfString(usuario, { width: col.usuarioW });
                const fechaH = doc.heightOfString(fecha, { width: col.fechaW });
                const accionH = doc.heightOfString(accion, { width: col.accionW });
                const rowH = Math.max(descHeight, usuarioH, fechaH, accionH, 12);

                if (y + rowH > doc.page.height - 80) {
                    doc.addPage();
                    // redraw header
                    const newTop = 40;
                    doc.rect(36, newTop - 4, 523, 20).fill('#2F5496');
                    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
                    doc.text('Fecha', col.fechaX, newTop, { width: col.fechaW });
                    doc.text('Usuario', col.usuarioX, newTop, { width: col.usuarioW });
                    doc.text('Acción', col.accionX, newTop, { width: col.accionW });
                    doc.text('Descripción', col.descripcionX, newTop, { width: col.descripcionW });
                    doc.fillColor('#000').font('Helvetica').fontSize(8);
                    y = newTop + 22;
                }

                // Alternar fondo ligero
                if (i % 2 === 0) {
                    doc.rect(36, y - 2, 523, rowH + 4).fill('#FFFFFF');
                } else {
                    doc.rect(36, y - 2, 523, rowH + 4).fill('#F7F7F7');
                }

                // Escribir columnas
                doc.fillColor('#000');
                doc.text(fecha, col.fechaX, y, { width: col.fechaW });
                doc.text(usuario, col.usuarioX, y, { width: col.usuarioW });
                doc.text(accion, col.accionX, y, { width: col.accionW });
                doc.text(descripcion, col.descripcionX, y, { width: col.descripcionW });

                y += rowH + 8;
            }

            // Footer summary
            doc.moveDown(1);
            doc.fontSize(8).font('Helvetica').fillColor('#666').text(`Total registros: ${registros.length}`, 40, doc.page.height - 45);

            // Registrar en auditoría la exportación de auditoría
            try {
                await ServicioAuditoria.registrarExportacion(req, 'auditoria', registros.length);
            } catch (err) {
                console.warn('No se pudo registrar auditoría para exportación de auditoría:', err && err.message);
            }

            doc.end();
        } catch (error) {
            console.error('Error exportando auditoría a PDF:', error);
            if (!res.headersSent) res.status(500).json({ error: 'Error exportando auditoría: ' + error.message });
        }
    }
}

module.exports = AuditoriaController;
