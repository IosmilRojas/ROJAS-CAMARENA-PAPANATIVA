// Controlador de Autenticación - Maneja lógica de login/logout
const Usuario = require('../models/Usuario');
const Trazabilidad = require('../models/Trazabilidad');

class AuthController {
    
    // Mostrar página de login
    static async mostrarLogin(req, res) {
        try {
            // Si ya está autenticado, redirigir al inicio
            if (req.session.usuario) {
                return res.redirect('/');
            }
            
            res.render('login', {
                titulo: 'Iniciar Sesión - Clasificador de Papas',
                error: null
            });
        } catch (error) {
            console.error('Error mostrando login:', error);
            res.status(500).render('error', {
                mensaje: 'Error interno del servidor',
                codigo: 500
            });
        }
    }

    // Procesar inicio de sesión
    static async procesarLogin(req, res) {
        try {
            const { correo, contraseña } = req.body;
            
            // Validar datos de entrada
            if (!correo || !contraseña) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión - Clasificador de Papas',
                    error: 'Correo y contraseña son requeridos'
                });
            }
            
            // Buscar usuario en base de datos
            let usuario = await Usuario.findOne({ 
                correo: correo.toLowerCase(),
                activo: true 
            });
            
            if (!usuario) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión - Clasificador de Papas',
                    error: 'Usuario no encontrado. Verifica tu correo electrónico o regístrate.'
                });
            }
            
            // Verificar contraseña
            const contraseñaValida = await usuario.compararContraseña(contraseña);
            
            if (!contraseñaValida) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión - Clasificador de Papas',
                    error: 'Credenciales inválidas'
                });
            }
            
            // Actualizar último acceso
            await usuario.actualizarUltimoAcceso();
            
            // Crear sesión
            req.session.usuario = {
                id: usuario._id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                avatarUrl: usuario.avatarUrl || null
            };
            
            console.log(`Usuario autenticado: ${usuario.correo}`);
            
            // Redirigir al inicio
            res.redirect('/');
            
        } catch (error) {
            console.error('Error procesando login:', error);
            res.render('login', {
                titulo: 'Iniciar Sesión - Clasificador de Papas',
                error: 'Error interno del servidor'
            });
        }
    }

    // Mostrar dashboard principal
    static async mostrarDashboard(req, res) {
        try {
            // Verificar autenticación
            if (!req.session.usuario) {
                return res.redirect('/login');
            }
            
            // Obtener estadísticas básicas para el dashboard
            const usuario = await Usuario.findById(req.session.usuario.id);
            
            res.render('dashboard', {
                titulo: 'Dashboard - Clasificador de Papas',
                usuario: req.session.usuario,
                fechaUltimoAcceso: usuario.ultimoAcceso
            });
            
        } catch (error) {
            console.error('Error mostrando dashboard:', error);
            res.status(500).render('error', {
                mensaje: 'Error cargando dashboard',
                codigo: 500
            });
        }
    }

    // Cerrar sesión
    static async cerrarSesion(req, res) {
        try {
            const usuarioId = req.session.usuario?.id;
            
            // Destruir sesión
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error cerrando sesión:', err);
                    return res.status(500).json({ error: 'Error cerrando sesión' });
                }
                
                console.log(`Sesión cerrada para usuario: ${usuarioId}`);
                res.redirect('/login');
            });
            
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // Middleware de autenticación
    static requireAuth(req, res, next) {
        if (!req.session.usuario) {
            return res.redirect('/login');
        }
        next();
    }

    // Middleware de autorización por rol
    static requireRole(rolesPermitidos) {
        return (req, res, next) => {
            if (!req.session.usuario) {
                return res.redirect('/login');
            }
            
            if (!rolesPermitidos.includes(req.session.usuario.rol)) {
                return res.status(403).render('error', {
                    mensaje: 'No tienes permisos para acceder a esta página',
                    codigo: 403
                });
            }
            
            next();
        };
    }

    // Procesar registro de usuario
    static async procesarRegistro(req, res) {
        try {
            const { nombre, apellido, correo, contraseña, confirmarContraseña, telefono, dni, direccion, avatarUrl, genero, fechaNacimiento, departamento, provincia, distrito } = req.body;
            
            // Validar datos de entrada
            if (!nombre || !apellido || !correo || !contraseña || !confirmarContraseña) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión - Clasificador de Papas',
                    error: 'Todos los campos obligatorios son requeridos (nombre, apellido, correo, contraseña)'
                });
            }
            
            // Validar formato de correo
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(correo)) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión - Clasificador de Papas',
                    error: 'Formato de correo electrónico inválido'
                });
            }
            
            // Validar longitud de contraseña
            if (contraseña.length < 8) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión - Clasificador de Papas',
                    error: 'La contraseña debe tener al menos 8 caracteres'
                });
            }
            
            // Verificar que las contraseñas coincidan
            if (contraseña !== confirmarContraseña) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión - Clasificador de Papas',
                    error: 'Las contraseñas no coinciden'
                });
            }
            
            // Verificar si el usuario ya existe
            const usuarioExistente = await Usuario.findOne({ 
                correo: correo.toLowerCase() 
            });
            
            if (usuarioExistente) {
                return res.render('login', {
                    titulo: 'Iniciar Sesión - Clasificador de Papas',
                    error: 'Ya existe un usuario con este correo electrónico'
                });
            }
            
            // Crear nuevo usuario
            const nuevoUsuario = new Usuario({
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                correo: correo.toLowerCase().trim(),
                contraseña: contraseña,
                telefono: telefono?.trim() || null,
                dni: dni?.trim() || null,
                direccion: direccion?.trim() || null,
                avatarUrl: avatarUrl?.trim() || null,
                genero: genero || undefined,
                fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
                ubicacion: {
                    departamento: departamento?.trim() || undefined,
                    provincia: provincia?.trim() || undefined,
                    distrito: distrito?.trim() || undefined,
                },
                rol: 'consultor', // Rol por defecto para registro público
                activo: true,
                fechaRegistro: new Date(),
                ultimoAcceso: new Date()
            });
            
            // Guardar usuario en base de datos
            await nuevoUsuario.save();
            
            console.log(`✅ Nuevo usuario registrado exitosamente: ${correo}`);
            
            // Crear sesión automáticamente después del registro
            req.session.usuario = {
                id: nuevoUsuario._id,
                idUsuario: nuevoUsuario.idUsuario,
                nombre: nuevoUsuario.nombre,
                apellido: nuevoUsuario.apellido,
                correo: nuevoUsuario.correo,
                rol: nuevoUsuario.rol,
                telefono: nuevoUsuario.telefono,
                fechaRegistro: nuevoUsuario.fechaRegistro
            };
            
            // Actualizar último acceso
            nuevoUsuario.ultimoAcceso = new Date();
            await nuevoUsuario.save();
            
            console.log(`🎉 Usuario registrado y sesión iniciada automáticamente: ${nuevoUsuario.correo}`);
            console.log(`📱 Redirigiendo a página principal...`);
            
            // Redirigir al inicio (página principal) con el usuario ya logueado
            res.redirect('/');
            
        } catch (error) {
            console.error('Error procesando registro:', error);
            
            // Determinar mensaje de error apropiado
            let mensajeError = 'Error interno del servidor';
            
            if (error.name === 'ValidationError') {
                const errores = Object.values(error.errors).map(err => err.message);
                mensajeError = 'Error de validación: ' + errores.join(', ');
            } else if (error.code === 11000) {
                // Error de duplicación (correo ya existe)
                mensajeError = 'Ya existe un usuario con este correo electrónico';
            }
            
            // Renderizar la página de login con el error
            res.render('login', {
                titulo: 'Iniciar Sesión - Clasificador de Papas',
                error: mensajeError
            });
        }
    }

    // Verificar disponibilidad de correo
    static async verificarCorreo(req, res) {
        try {
            const { correo } = req.body;
            
            if (!correo) {
                return res.status(400).json({
                    disponible: false,
                    message: 'Correo es requerido'
                });
            }
            
            // Validar formato de correo
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(correo)) {
                return res.status(400).json({
                    disponible: false,
                    message: 'Formato de correo inválido'
                });
            }
            
            const usuarioExistente = await Usuario.findOne({ 
                correo: correo.toLowerCase() 
            });
            
            res.json({
                disponible: !usuarioExistente,
                message: usuarioExistente ? 
                    'Este correo ya está registrado' : 
                    'Correo disponible'
            });
            
        } catch (error) {
            console.error('Error verificando correo:', error);
            res.status(500).json({
                disponible: false,
                message: 'Error verificando disponibilidad'
            });
        }
    }

    // Obtener perfil de usuario actual
    static async obtenerPerfil(req, res) {
        try {
            if (!req.session.usuario) {
                return res.status(401).json({ error: 'No autenticado' });
            }
            
            const usuario = await Usuario.findById(req.session.usuario.id)
                .select('-contraseña');
            
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            
            res.json({
                usuario: {
                    id: usuario._id,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.rol,
                    fechaRegistro: usuario.fechaRegistro,
                    ultimoAcceso: usuario.ultimoAcceso
                }
            });
            
        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}

module.exports = AuthController;