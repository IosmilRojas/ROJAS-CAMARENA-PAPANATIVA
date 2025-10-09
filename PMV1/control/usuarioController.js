// Controlador de Usuario - Maneja lógica de gestión de usuarios
const Usuario = require('../modelo/Usuario');
const Trazabilidad = require('../modelo/Trazabilidad');

class UsuarioController {
    
    // Crear nuevo usuario (solo administradores)
    static async crearUsuario(req, res) {
        try {
            // Verificar permisos de administrador
            if (!req.session.usuario || req.session.usuario.rol !== 'administrador') {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }
            
            const { nombre, correo, contraseña, rol } = req.body;
            
            // Validar datos requeridos
            if (!nombre || !correo || !contraseña) {
                return res.status(400).json({ 
                    error: 'Nombre, correo y contraseña son requeridos' 
                });
            }
            
            // Verificar que el correo no exista
            const usuarioExistente = await Usuario.findOne({ 
                correo: correo.toLowerCase() 
            });
            
            if (usuarioExistente) {
                return res.status(409).json({ 
                    error: 'Ya existe un usuario con este correo' 
                });
            }
            
            // Crear nuevo usuario
            const nuevoUsuario = new Usuario({
                nombre: nombre.trim(),
                correo: correo.toLowerCase().trim(),
                contraseña,
                rol: rol || 'operador'
            });
            
            await nuevoUsuario.save();
            
            // Log de auditoría
            console.log(`Usuario creado: ${nuevoUsuario.correo} por ${req.session.usuario.correo}`);
            
            // Responder sin incluir la contraseña
            const usuarioRespuesta = {
                id: nuevoUsuario._id,
                idUsuario: nuevoUsuario.idUsuario,
                nombre: nuevoUsuario.nombre,
                correo: nuevoUsuario.correo,
                rol: nuevoUsuario.rol,
                fechaRegistro: nuevoUsuario.fechaRegistro,
                activo: nuevoUsuario.activo
            };
            
            res.status(201).json({
                mensaje: 'Usuario creado exitosamente',
                usuario: usuarioRespuesta
            });
            
        } catch (error) {
            console.error('Error creando usuario:', error);
            
            if (error.code === 11000) {
                return res.status(409).json({ 
                    error: 'Ya existe un usuario con este correo' 
                });
            }
            
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // Listar usuarios (solo administradores)
    static async listarUsuarios(req, res) {
        try {
            // Verificar permisos de administrador
            if (!req.session.usuario || req.session.usuario.rol !== 'administrador') {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }
            
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const busqueda = req.query.busqueda || '';
            
            // Construir filtros de búsqueda
            const filtros = {};
            if (busqueda) {
                filtros.$or = [
                    { nombre: { $regex: busqueda, $options: 'i' } },
                    { correo: { $regex: busqueda, $options: 'i' } }
                ];
            }
            
            // Obtener usuarios (sin contraseñas)
            const usuarios = await Usuario.find(filtros)
                .select('-contraseña')
                .sort({ fechaRegistro: -1 })
                .limit(limit)
                .skip(skip);
            
            const total = await Usuario.countDocuments(filtros);
            
            res.json({
                usuarios,
                paginacion: {
                    total,
                    pagina: page,
                    limitePorPagina: limit,
                    totalPaginas: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            console.error('Error listando usuarios:', error);
            res.status(500).json({ error: 'Error obteniendo usuarios' });
        }
    }

    // Obtener usuario específico
    static async obtenerUsuario(req, res) {
        try {
            const { idUsuario } = req.params;
            
            // Verificar permisos: admin puede ver cualquiera, usuario solo a sí mismo
            if (req.session.usuario.rol !== 'administrador' && 
                req.session.usuario.id !== idUsuario) {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }
            
            const usuario = await Usuario.findById(idUsuario)
                .select('-contraseña');
            
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            
            res.json({ usuario });
            
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            res.status(500).json({ error: 'Error obteniendo usuario' });
        }
    }

    // Actualizar usuario
    static async actualizarUsuario(req, res) {
        try {
            const { idUsuario } = req.params;
            const { nombre, correo, rol, activo } = req.body;
            
            // Verificar permisos
            const esAdministrador = req.session.usuario.rol === 'administrador';
            const esPropio = req.session.usuario.id === idUsuario;
            
            if (!esAdministrador && !esPropio) {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }
            
            // Buscar usuario
            const usuario = await Usuario.findById(idUsuario);
            
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            
            // Preparar datos de actualización
            const datosActualizacion = {};
            
            if (nombre) datosActualizacion.nombre = nombre.trim();
            if (correo) datosActualizacion.correo = correo.toLowerCase().trim();
            
            // Solo administradores pueden cambiar rol y estado activo
            if (esAdministrador) {
                if (rol) datosActualizacion.rol = rol;
                if (typeof activo === 'boolean') datosActualizacion.activo = activo;
            }
            
            // Verificar correo único si se está cambiando
            if (correo && correo !== usuario.correo) {
                const correoExistente = await Usuario.findOne({ 
                    correo: correo.toLowerCase(),
                    _id: { $ne: idUsuario }
                });
                
                if (correoExistente) {
                    return res.status(409).json({ 
                        error: 'Ya existe otro usuario con este correo' 
                    });
                }
            }
            
            // Actualizar usuario
            const usuarioActualizado = await Usuario.findByIdAndUpdate(
                idUsuario,
                datosActualizacion,
                { new: true, runValidators: true }
            ).select('-contraseña');
            
            console.log(`Usuario actualizado: ${usuarioActualizado.correo} por ${req.session.usuario.correo}`);
            
            res.json({
                mensaje: 'Usuario actualizado exitosamente',
                usuario: usuarioActualizado
            });
            
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            
            if (error.code === 11000) {
                return res.status(409).json({ 
                    error: 'Ya existe un usuario con este correo' 
                });
            }
            
            res.status(500).json({ error: 'Error actualizando usuario' });
        }
    }

    // Cambiar contraseña
    static async cambiarContraseña(req, res) {
        try {
            const { idUsuario } = req.params;
            const { contraseñaActual, nuevaContraseña } = req.body;
            
            // Verificar que sea el propio usuario o administrador
            const esAdministrador = req.session.usuario.rol === 'administrador';
            const esPropio = req.session.usuario.id === idUsuario;
            
            if (!esAdministrador && !esPropio) {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }
            
            // Validar nueva contraseña
            if (!nuevaContraseña || nuevaContraseña.length < 6) {
                return res.status(400).json({ 
                    error: 'La nueva contraseña debe tener al menos 6 caracteres' 
                });
            }
            
            const usuario = await Usuario.findById(idUsuario);
            
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            
            // Si no es administrador, verificar contraseña actual
            if (!esAdministrador) {
                if (!contraseñaActual) {
                    return res.status(400).json({ 
                        error: 'Contraseña actual requerida' 
                    });
                }
                
                const contraseñaValida = await usuario.compararContraseña(contraseñaActual);
                
                if (!contraseñaValida) {
                    return res.status(401).json({ 
                        error: 'Contraseña actual incorrecta' 
                    });
                }
            }
            
            // Cambiar contraseña
            usuario.contraseña = nuevaContraseña;
            await usuario.save();
            
            console.log(`Contraseña cambiada para: ${usuario.correo} por ${req.session.usuario.correo}`);
            
            res.json({ mensaje: 'Contraseña actualizada exitosamente' });
            
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            res.status(500).json({ error: 'Error cambiando contraseña' });
        }
    }

    // Desactivar usuario (soft delete)
    static async desactivarUsuario(req, res) {
        try {
            // Solo administradores pueden desactivar usuarios
            if (!req.session.usuario || req.session.usuario.rol !== 'administrador') {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }
            
            const { idUsuario } = req.params;
            
            // No permitir desactivar su propia cuenta
            if (req.session.usuario.id === idUsuario) {
                return res.status(400).json({ 
                    error: 'No puedes desactivar tu propia cuenta' 
                });
            }
            
            const usuario = await Usuario.findByIdAndUpdate(
                idUsuario,
                { activo: false },
                { new: true }
            ).select('-contraseña');
            
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            
            console.log(`Usuario desactivado: ${usuario.correo} por ${req.session.usuario.correo}`);
            
            res.json({
                mensaje: 'Usuario desactivado exitosamente',
                usuario
            });
            
        } catch (error) {
            console.error('Error desactivando usuario:', error);
            res.status(500).json({ error: 'Error desactivando usuario' });
        }
    }

    // Obtener estadísticas de usuarios (solo administradores)
    static async obtenerEstadisticas(req, res) {
        try {
            if (!req.session.usuario || req.session.usuario.rol !== 'administrador') {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }
            
            const estadisticas = await Usuario.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsuarios: { $sum: 1 },
                        usuariosActivos: { 
                            $sum: { $cond: ['$activo', 1, 0] } 
                        },
                        administradores: { 
                            $sum: { $cond: [{ $eq: ['$rol', 'administrador'] }, 1, 0] } 
                        },
                        operadores: { 
                            $sum: { $cond: [{ $eq: ['$rol', 'operador'] }, 1, 0] } 
                        },
                        consultores: { 
                            $sum: { $cond: [{ $eq: ['$rol', 'consultor'] }, 1, 0] } 
                        }
                    }
                }
            ]);
            
            const resultado = estadisticas[0] || {
                totalUsuarios: 0,
                usuariosActivos: 0,
                administradores: 0,
                operadores: 0,
                consultores: 0
            };
            
            res.json(resultado);
            
        } catch (error) {
            console.error('Error obteniendo estadísticas de usuarios:', error);
            res.status(500).json({ error: 'Error obteniendo estadísticas' });
        }
    }
}

module.exports = UsuarioController;