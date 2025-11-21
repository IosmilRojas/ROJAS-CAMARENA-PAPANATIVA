// Controller para Gestión de Usuarios
const Usuario = require('../models/Usuario');
const ServicioAuditoria = require('../services/servicioAuditoria');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');

// Configuración de email (puedes ajustar según tu servidor)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'localhost',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: process.env.EMAIL_USER ? {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    } : undefined
});

// Generar contraseña temporal
function generarContraseñaTemporal() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Obtener página de gestión de usuarios
exports.mostrarGestionUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find({ activo: true }).select('-contraseña');
        res.render('gestion-usuarios', {
            titulo: 'Gestión de Usuarios',
            usuario: req.session.usuario,
            usuarios: usuarios
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { 
            mensaje: 'Error al cargar gestión de usuarios',
            usuario: req.session.usuario 
        });
    }
};

// Listar todos los usuarios (API)
exports.listarUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find({ activo: true }).select('-contraseña');
        res.json({
            success: true,
            usuarios: usuarios
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Listar usuarios desactivados (API)
exports.listarUsuariosDesactivados = async (req, res) => {
    try {
        const usuarios = await Usuario.find({ activo: false }).select('-contraseña');
        res.json({
            success: true,
            usuarios: usuarios
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Crear nuevo usuario
exports.crearUsuario = async (req, res) => {
    try {
        const { nombre, apellido, correo, rol, departamento, dni, telefono, genero, fechaNacimiento, direccion, provincia, distrito } = req.body;
        
        // Validar que el correo no exista
        const usuarioExistente = await Usuario.findOne({ correo });
        if (usuarioExistente) {
            return res.status(400).json({
                success: false,
                error: 'El correo ya está registrado'
            });
        }
        
        // Generar contraseña temporal
        const contraseñaTemporal = generarContraseñaTemporal();
        const contraseñaEncriptada = await bcrypt.hash(contraseñaTemporal, 10);
        
        // Crear usuario
        const nuevoUsuario = new Usuario({
            nombre,
            apellido,
            correo,
            contraseña: contraseñaEncriptada,
            rol: rol || 'operador',
            departamento,
            dni,
            telefono,
            genero: genero || 'no-especifica',
            fechaNacimiento,
            direccion,
            ubicacion: {
                departamento,
                provincia,
                distrito
            },
            activo: true,
            fechaCreacion: new Date(),
            permisos: obtenerPermisosDefault(rol || 'operador')
        });
        
        await nuevoUsuario.save();
        
        // Enviar correo con credenciales
        await enviarCorreoCreacion(correo, nombre, contraseñaTemporal);
        
        // Registrar acción en log/auditoria
        await ServicioAuditoria.registrarCreacionUsuario(req, nuevoUsuario);
        
        res.json({
            success: true,
            mensaje: 'Usuario creado exitosamente',
            usuario: {
                _id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                apellido: nuevoUsuario.apellido,
                correo: nuevoUsuario.correo,
                rol: nuevoUsuario.rol,
                departamento: nuevoUsuario.departamento,
                activo: nuevoUsuario.activo
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Obtener usuario específico
exports.obtenerUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id).select('-contraseña');
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        res.json({
            success: true,
            usuario: usuario
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Actualizar usuario
exports.actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, correo, rol, dni, telefono, genero, fechaNacimiento, direccion, ubicacion, departamento, provincia, distrito, permisos } = req.body;
        
        console.log('Actualizando usuario:', id);
        console.log('Datos recibidos:', { nombre, apellido, correo, rol, ubicacion });
        
        // Verificar que ID es válido
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                error: 'ID de usuario inválido'
            });
        }
        
        // Verificar usuario existe
        const usuarioActual = await Usuario.findById(id);
        if (!usuarioActual) {
            console.error('Usuario no encontrado con ID:', id);
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        // Validar correo único (si cambió)
        if (correo && correo !== usuarioActual.correo) {
            const correoExistente = await Usuario.findOne({ correo });
            if (correoExistente) {
                return res.status(400).json({
                    success: false,
                    error: 'El correo ya está en uso'
                });
            }
        }
        
        // Manejar ubicacion - puede venir como objeto anidado o como campos separados
        let ubicacionActualizada = usuarioActual.ubicacion || { departamento: '', provincia: '', distrito: '' };
        
        if (ubicacion && typeof ubicacion === 'object') {
            // Viene como objeto anidado (nuevo formato)
            ubicacionActualizada = {
                departamento: ubicacion.departamento?.trim() || usuarioActual.ubicacion?.departamento || '',
                provincia: ubicacion.provincia?.trim() || usuarioActual.ubicacion?.provincia || '',
                distrito: ubicacion.distrito?.trim() || usuarioActual.ubicacion?.distrito || ''
            };
        } else if (departamento || provincia || distrito) {
            // Viene como campos separados (formato antiguo)
            ubicacionActualizada = {
                departamento: departamento?.trim() || usuarioActual.ubicacion?.departamento || '',
                provincia: provincia?.trim() || usuarioActual.ubicacion?.provincia || '',
                distrito: distrito?.trim() || usuarioActual.ubicacion?.distrito || ''
            };
        }
        
        // Preparar objeto de actualización
        const actualizacion = {
            nombre: nombre && nombre.trim() ? nombre : usuarioActual.nombre,
            apellido: apellido && apellido.trim() ? apellido : usuarioActual.apellido,
            correo: correo && correo.trim() ? correo : usuarioActual.correo,
            rol: rol && rol.trim() ? rol : usuarioActual.rol,
            dni: dni && dni.trim() ? dni : usuarioActual.dni,
            telefono: telefono && telefono.trim() ? telefono : usuarioActual.telefono,
            genero: genero && genero.trim() ? genero : usuarioActual.genero,
            fechaNacimiento: fechaNacimiento && fechaNacimiento.trim() ? fechaNacimiento : usuarioActual.fechaNacimiento,
            direccion: direccion && direccion.trim() ? direccion : usuarioActual.direccion,
            ubicacion: ubicacionActualizada,
            permisos: permisos && Array.isArray(permisos) ? permisos : usuarioActual.permisos,
            fechaActualizacion: new Date()
        };
        
        console.log('Objeto de actualización:', actualizacion);
        
        // Actualizar usuario
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            id,
            actualizacion,
            { new: true, runValidators: true }
        );
        
        if (!usuarioActualizado) {
            console.error('No se pudo actualizar el usuario');
            return res.status(500).json({
                success: false,
                error: 'No se pudo actualizar el usuario'
            });
        }
        
        console.log('Usuario actualizado correctamente:', usuarioActualizado._id);
        
        // Registrar en auditoria
        try {
            await ServicioAuditoria.registrarEdicionUsuario(req, usuarioActualizado);
        } catch (auditError) {
            console.error('Error al registrar en auditoria:', auditError);
            // No fallar la actualización por error de auditoría
        }
        
        res.json({
            success: true,
            mensaje: 'Usuario actualizado exitosamente',
            usuario: usuarioActualizado
        });
    } catch (error) {
        console.error('Error en actualizarUsuario:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar usuario'
        });
    }
};

// Desactivar usuario
exports.desactivarUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        usuario.activo = !usuario.activo;
        usuario.fechaActualizacion = new Date();
        await usuario.save();
        
        // Registrar auditoria
        const accionDescripcion = usuario.activo ? 
            `Usuario activado: ${usuario.nombre}` : 
            `Usuario desactivado: ${usuario.nombre}`;
        
        await ServicioAuditoria.registrarAccion(req, 'cambiar_rol', accionDescripcion, {
            tablaAfectada: 'usuarios',
            idObjeto: usuario._id.toString(),
            datosRelacionados: {
                nombre: usuario.nombre,
                nuevoEstado: usuario.activo ? 'activado' : 'desactivado'
            }
        });
        
        res.json({
            success: true,
            mensaje: `Usuario ${usuario.activo ? 'activado' : 'desactivado'} exitosamente`
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Eliminar usuario permanentemente
exports.eliminarUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        const nombreUsuario = usuario.nombre;
        await Usuario.findByIdAndDelete(req.params.id);
        
        // Registrar auditoria
        await ServicioAuditoria.registrarAccion(req, 'eliminar_usuario', 
            `Usuario eliminado permanentemente: ${nombreUsuario}`, {
                tablaAfectada: 'usuarios',
                idObjeto: req.params.id,
                datosRelacionados: {
                    nombre: nombreUsuario
                }
            }
        );
        
        res.json({
            success: true,
            mensaje: 'Usuario eliminado permanentemente'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Cambiar contraseña
exports.cambiarContraseña = async (req, res) => {
    try {
        const { contraseñaActual, contraseñaNueva } = req.body;
        
        const usuario = await Usuario.findById(req.params.id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        // Verificar contraseña actual
        const esValida = await bcrypt.compare(contraseñaActual, usuario.contraseña);
        
        if (!esValida) {
            return res.status(400).json({
                success: false,
                error: 'Contraseña actual incorrecta'
            });
        }
        
        // Encriptar nueva contraseña
        usuario.contraseña = await bcrypt.hash(contraseñaNueva, 10);
        usuario.fechaActualizacion = new Date();
        await usuario.save();
        
        // Registrar auditoria
        await ServicioAuditoria.registrarAccion(req, 'cambiar_contraseña',
            `Contraseña actualizada para ${usuario.nombre}`, {
                tablaAfectada: 'usuarios',
                idObjeto: usuario._id.toString()
            }
        );
        
        res.json({
            success: true,
            mensaje: 'Contraseña cambiada exitosamente'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Añadir watermark (marca de agua) a todas las páginas
function addWatermark(doc, pageNum = 1) {
    try {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        // Salvar estado actual del documento
        doc.save();

        // Watermark centrado y diagonal (seguro dentro de save/restore)
        const text = 'PapaIA';
        doc.fillColor('#E8E8E8');
        doc.opacity(0.08);
        doc.font('Helvetica-Bold');
        doc.fontSize(80);

        // Trasladar al centro y rotar localmente
        const cx = pageWidth / 2;
        const cy = pageHeight / 2;
        doc.translate(cx, cy);
        doc.rotate(-45, { origin: [0, 0] });

        // Dibujar texto centrado en el origen local
        const textWidth = doc.widthOfString(text);
        doc.text(text, -textWidth / 2, -40, { align: 'center' });

        // Restaurar estado
        doc.rotate(45, { origin: [0, 0] });
        doc.translate(-cx, -cy);
        doc.opacity(1);
        doc.restore();
    } catch (error) {
        console.warn('Error añadiendo watermark:', error.message);
    }
}

// Exportar estadísticas a PDF
exports.exportarEstadisticasPDF = async (req, res) => {
    try {
        // Obtener datos de todos los usuarios (activos e inactivos)
        const usuariosActivos = await Usuario.find({ activo: true }).select('-contraseña');
        const usuariosDesactivados = await Usuario.find({ activo: false }).select('-contraseña');
        
        // Calcular estadísticas
        const totalUsuarios = usuariosActivos.length;
        const totalDesactivados = usuariosDesactivados.length;
                const usuariosAdministrador = usuariosActivos.filter(u => u.rol === 'administrador').length;
                const usuariosConsultor = usuariosActivos.filter(u => u.rol === 'consultor').length;

                // Cálculo de días promedio desde último acceso (para métricas)
                const ahora = new Date();
                const usuariosConAcceso = usuariosActivos.filter(u => u.ultimoAcceso);
                const diasPromedioSinAcceso = usuariosConAcceso.length > 0
                        ? Math.round(usuariosConAcceso.reduce((sum, u) => {
                                const dias = Math.floor((ahora - new Date(u.ultimoAcceso)) / (1000 * 60 * 60 * 24));
                                return sum + dias;
                            }, 0) / usuariosConAcceso.length)
                        : 0;
        
        // Registrar en auditoría
        const exportadoPor = req.session?.usuario?.nombre || 'Sistema';
        try {
            const razón = req.body?.razon || 'Exportación manual de estadísticas del sistema';
            await ServicioAuditoria.registrarAccion(req, 'exportar_estadisticas', 
                `Estadísticas del sistema exportadas a PDF`,
                {
                    tablaAfectada: 'usuarios',
                    razon: razón,
                    totalUsuarios: totalUsuarios,
                    usuariosDesactivados: totalDesactivados,
                    exportadoPor: exportadoPor
                }
            );
        } catch (auditError) {
            console.warn('Advertencia al registrar en auditoría:', auditError.message);
        }
        
        // Crear documento PDF
        const doc = new PDFDocument({
            bufferPages: true,
            margin: 40,
            size: 'A4'
        });
        
        const timestamp = moment().format('YYYY-MM-DD_HHmmss');
        const filename = `estadisticas_${timestamp}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        
    doc.pipe(res);
    console.log('PDF: doc.pipe(res) connected');

    // ========== ENCABEZADO ==========
    console.log('PDF: adding watermark and header');
    addWatermark(doc);
        
        // Logo y título (posicionado dinámicamente para evitar solapamientos)
        try {
            const logoPath = path.join(__dirname, '../public/assets/images/logo.jpg');
            doc.image(logoPath, 40, 30, { width: 60, height: 60 });
        } catch (error) {
            console.warn('Logo no encontrado');
        }

    const headerX = 110;
    const headerWidth = 420;
    let headerY = 35;

    // Título: calcular altura para avanzar correctamente
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1F4788');
    const titleText = 'ESTADÍSTICAS DEL SISTEMA';
    const titleHeight = doc.heightOfString(titleText, { width: headerWidth });
    doc.text(titleText, headerX, headerY, { width: headerWidth, align: 'left' });
    headerY = headerY + titleHeight + 6;

    // Subtítulo (reporte)
    doc.fontSize(10).font('Helvetica').fillColor('#666');
    const subtitleText = 'Reporte de Gestión de Usuarios';
    const subtitleHeight = doc.heightOfString(subtitleText, { width: headerWidth });
    doc.text(subtitleText, headerX, headerY, { width: headerWidth, align: 'left' });
    headerY = headerY + subtitleHeight + 4;

    // Fecha
    doc.fontSize(9).font('Helvetica').fillColor('#999');
    const fechaText = `${moment().format('DD/MM/YYYY HH:mm:ss')}`;
    const fechaHeight = doc.heightOfString(fechaText, { width: headerWidth });
    doc.text(fechaText, headerX, headerY, { width: headerWidth, align: 'left' });
    headerY = headerY + fechaHeight + 4;

    // Indicar quién exportó (usar height para evitar superposición)
    doc.fontSize(9).font('Helvetica').fillColor('#666');
    const exportText = `Exportado por: ${exportadoPor}`;
    const exportHeight = doc.heightOfString(exportText, { width: headerWidth });
    doc.text(exportText, headerX, headerY, { width: headerWidth, align: 'left' });
    headerY = headerY + exportHeight + 8;

    // Línea separadora colocada después del bloque de encabezado
    const ruleY = Math.max(headerY, 100);
    doc.strokeColor('#CCCCCC').moveTo(40, ruleY).lineTo(555, ruleY).stroke();
    doc.y = ruleY + 10;
        
        // ========== ESTADÍSTICAS GENERALES ==========
    // Evitar caracteres emoji que no siempre se renderizan bien en PDF (posible garble)
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('Resumen General', 40);
        doc.moveDown(0.5);
        
        // Cajas de estadísticas
        const boxY = doc.y;
        const boxHeight = 70;
        const boxWidth = 110;
        const gap = 8;
        
        // Caja 1: Total
        doc.rect(40, boxY, boxWidth, boxHeight).stroke({ color: '#2F5496', width: 2 });
        doc.fontSize(9).font('Helvetica').fillColor('#666').text('Total Usuarios', 45, boxY + 8, { width: boxWidth - 10 });
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#2F5496').text(totalUsuarios.toString(), 45, boxY + 28, { width: boxWidth - 10, align: 'center' });
        
        // Caja 2: Activos
        doc.rect(40 + boxWidth + gap, boxY, boxWidth, boxHeight).stroke({ color: '#27AE60', width: 2 });
        doc.fontSize(9).font('Helvetica').fillColor('#666').text('Activos', 45 + boxWidth + gap, boxY + 8, { width: boxWidth - 10 });
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#27AE60').text(usuariosActivos.length.toString(), 45 + boxWidth + gap, boxY + 28, { width: boxWidth - 10, align: 'center' });
        
    // Caja 3: Inactivos
    doc.rect(40 + (boxWidth + gap) * 2, boxY, boxWidth, boxHeight).stroke({ color: '#E74C3C', width: 2 });
    doc.fontSize(9).font('Helvetica').fillColor('#666').text('Desactivados', 45 + (boxWidth + gap) * 2, boxY + 8, { width: boxWidth - 10 });
    // Mostrar número de desactivados (usar 0 si no hay ninguno)
    const desactivadosCount = (typeof totalDesactivados === 'number') ? totalDesactivados : (Array.isArray(usuariosDesactivados) ? usuariosDesactivados.length : 0);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#E74C3C').text(desactivadosCount.toString(), 45 + (boxWidth + gap) * 2, boxY + 28, { width: boxWidth - 10, align: 'center' });
        
        // Caja 4: Administradores
        doc.rect(40 + (boxWidth + gap) * 3, boxY, boxWidth, boxHeight).stroke({ color: '#F39C12', width: 2 });
        doc.fontSize(9).font('Helvetica').fillColor('#666').text('Admins', 45 + (boxWidth + gap) * 3, boxY + 8, { width: boxWidth - 10 });
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#F39C12').text(usuariosAdministrador.toString(), 45 + (boxWidth + gap) * 3, boxY + 28, { width: boxWidth - 10, align: 'center' });
        
    doc.y = boxY + boxHeight + 15;
    console.log('PDF: header and boxes drawn, y=' + doc.y);

    // Información adicional
        doc.fontSize(9).font('Helvetica').fillColor('#333333');
        doc.text(`Total en el sistema: ${totalUsuarios + totalDesactivados} usuarios  |  Promedio de días sin acceso: ${diasPromedioSinAcceso} días`, 50);
        doc.moveDown(0.8);
        
        // ========== TABLA DE USUARIOS ACTIVOS ==========
        if (usuariosActivos.length > 0) {
            doc.moveDown(1);
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#27AE60').text('Usuarios Activos (' + usuariosActivos.length + ')');
            doc.moveDown(0.5);
            
            const tableTop = doc.y;
            
            // Encabezado
            const headerY = tableTop;
            doc.rect(40, headerY, 515, 20).fill('#27AE60');
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
            doc.text('Nombre', 45, headerY + 6);
            doc.text('Correo', 150, headerY + 6);
            doc.text('Rol', 300, headerY + 6);
            doc.text('Último Acceso', 350, headerY + 6);
            
            // Datos
            let rowY = headerY + 20;
            usuariosActivos.forEach((usuario, idx) => {
                if (rowY > doc.page.height - 80) {
                    doc.addPage();
                    addWatermark(doc);
                    rowY = 40;
                }
                
                const bgColor = idx % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
                doc.rect(40, rowY, 515, 16).fill(bgColor);
                
                const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.substring(0, 25);
                const correo = (usuario.correo || '').substring(0, 35);
                const rol = usuario.rol || '';
                const ultimoAcceso = usuario.ultimoAcceso 
                    ? moment(usuario.ultimoAcceso).format('DD/MM/YY HH:mm')
                    : 'Nunca';
                
                doc.fontSize(7).font('Helvetica').fillColor('#000000');
                doc.text(nombreCompleto, 45, rowY + 4);
                doc.text(correo, 150, rowY + 4);
                doc.text(rol, 300, rowY + 4);
                doc.text(ultimoAcceso, 350, rowY + 4);
                
                rowY += 16;
            });
            
            doc.moveTo(40, rowY).lineTo(555, rowY).stroke();
            doc.y = rowY + 5;
        }
        
        // ========== TABLA DE USUARIOS DESACTIVADOS ==========
        if (usuariosDesactivados.length > 0) {
            doc.moveDown(1);
            // Alinear el título centrado sobre la tabla de desactivados
            const desTitle = 'Usuarios Desactivados (' + usuariosDesactivados.length + ')';
            // Alinear título a la izquierda, manteniendo leve margen (alineado con la columna "Nombre")
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#E74C3C').text(desTitle, 45, doc.y, { align: 'left' });
            doc.moveDown(0.5);

            const tableTop = doc.y;
            
            // Encabezado
            const headerY = tableTop;
            doc.rect(40, headerY, 515, 20).fill('#E74C3C');
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
            doc.text('Nombre', 45, headerY + 6);
            doc.text('Correo', 150, headerY + 6);
            doc.text('Rol', 300, headerY + 6);
            doc.text('Desactivado El', 350, headerY + 6);
            
            // Datos
            let rowY = headerY + 20;
            usuariosDesactivados.forEach((usuario, idx) => {
                if (rowY > doc.page.height - 80) {
                    doc.addPage();
                    addWatermark(doc);
                    rowY = 40;
                }
                
                const bgColor = idx % 2 === 0 ? '#FFF5F5' : '#FFFFFF';
                doc.rect(40, rowY, 515, 16).fill(bgColor);
                
                const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.substring(0, 25);
                const correo = (usuario.correo || '').substring(0, 35);
                const rol = usuario.rol || '';
                const desactivadoEl = usuario.fechaActualizacion 
                    ? moment(usuario.fechaActualizacion).format('DD/MM/YY')
                    : 'No registrado';
                
                doc.fontSize(7).font('Helvetica').fillColor('#000000');
                doc.text(nombreCompleto, 45, rowY + 4);
                doc.text(correo, 150, rowY + 4);
                doc.text(rol, 300, rowY + 4);
                doc.text(desactivadoEl, 350, rowY + 4);
                
                rowY += 16;
            });
            
            doc.moveTo(40, rowY).lineTo(555, rowY).stroke();
            doc.y = rowY + 5;
        }
        
        // ========== PIE DE PÁGINA ==========
        doc.moveDown(1);
        doc.moveTo(40, doc.page.height - 50).lineTo(555, doc.page.height - 50).stroke('#CCCCCC');
        
        doc.fontSize(7).font('Helvetica').fillColor('#999999');
        const totalAll = usuariosActivos.length + usuariosDesactivados.length;
        doc.text(`Total: ${totalAll} usuarios | Activos: ${usuariosActivos.length} | Desactivados: ${usuariosDesactivados.length}`, 40, doc.page.height - 45);
        doc.text(`PapaIA - ${moment().format('DD/MM/YYYY HH:mm:ss')}`, 400, doc.page.height - 45, { align: 'right' });
        
    console.log('PDF: finalizing document');
    doc.end();
        
    } catch (error) {
        console.error('Error generando PDF de estadísticas:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generando PDF: ' + error.message });
        }
    }
};

// Funciones auxiliares

function obtenerPermisosDefault(rol) {
    const permisosDefault = {
        operador: ['clasificar'],
        revisor: ['clasificar', 'validar', 'reportes'],
        administrador: ['clasificar', 'validar', 'reportes', 'usuarios', 'administracion']
    };
    
    return permisosDefault[rol] || permisosDefault.operador;
}

async function enviarCorreoCreacion(correo, nombre, contraseña) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@papaIA.com',
            to: correo,
            subject: 'Bienvenido a PapaIA - Credenciales de Acceso',
            html: `
                <h2>¡Bienvenido a PapaIA!</h2>
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>Tu cuenta ha sido creada. A continuación encontrarás tus credenciales de acceso:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Correo:</strong> ${correo}</p>
                    <p><strong>Contraseña temporal:</strong> ${contraseña}</p>
                </div>
                <p><strong>Importante:</strong> Te recomendamos cambiar tu contraseña en el primer acceso.</p>
                <p>Para acceder, ingresa a: <a href="http://localhost:3000/login">Sistema PapaIA</a></p>
                <p>Si tienes algún problema, contacta con el administrador.</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error al enviar correo:', error);
        // No fallar si no se puede enviar el correo
    }
}

module.exports = exports;
