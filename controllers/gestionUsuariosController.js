// Controller para Gestión de Usuarios
const Usuario = require('../models/Usuario');
const ServicioAuditoria = require('../services/servicioAuditoria');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

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
        const { nombre, apellido, correo, rol, departamento, dni, telefono, genero, fechaNacimiento, direccion, provincia, distrito, permisos } = req.body;
        
        console.log('Actualizando usuario:', id);
        console.log('Datos recibidos:', { nombre, apellido, correo, rol, departamento });
        
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
        
        // Preparar objeto de actualización
        const actualizacion = {
            nombre: nombre && nombre.trim() ? nombre : usuarioActual.nombre,
            apellido: apellido && apellido.trim() ? apellido : usuarioActual.apellido,
            correo: correo && correo.trim() ? correo : usuarioActual.correo,
            rol: rol && rol.trim() ? rol : usuarioActual.rol,
            departamento: departamento && departamento.trim() ? departamento : usuarioActual.departamento,
            dni: dni && dni.trim() ? dni : usuarioActual.dni,
            telefono: telefono && telefono.trim() ? telefono : usuarioActual.telefono,
            genero: genero && genero.trim() ? genero : usuarioActual.genero,
            fechaNacimiento: fechaNacimiento && fechaNacimiento.trim() ? fechaNacimiento : usuarioActual.fechaNacimiento,
            direccion: direccion && direccion.trim() ? direccion : usuarioActual.direccion,
            ubicacion: {
                departamento: departamento && departamento.trim() ? departamento : (usuarioActual.ubicacion?.departamento || ''),
                provincia: provincia && provincia.trim() ? provincia : (usuarioActual.ubicacion?.provincia || ''),
                distrito: distrito && distrito.trim() ? distrito : (usuarioActual.ubicacion?.distrito || '')
            },
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
