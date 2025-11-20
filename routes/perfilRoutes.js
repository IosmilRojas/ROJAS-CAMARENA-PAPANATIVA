const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const Usuario = require('../models/Usuario');

// Crear carpeta profiles si no existe
const profilesDir = path.join(__dirname, '../public/uploads/profiles');
if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
    console.log('✅ Carpeta profiles creada:', profilesDir);
}

// Configuración de multer para fotos de perfil
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profilesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (JPG, PNG)'));
    }
});

// Middleware de autenticación
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.usuario) {
        return next();
    }
    res.redirect('/login');
};

// Ver perfil
router.get('/', isAuthenticated, async (req, res) => {
    try {
        console.log('Accediendo al perfil de usuario:', req.session.usuario.nombre);
        console.log('ID del usuario en sesión:', req.session.usuario.id);
        
        const usuario = await Usuario.findById(req.session.usuario.id);
        
        if (!usuario) {
            console.error('Usuario no encontrado en BD con ID:', req.session.usuario.id);
            return res.status(404).render('error', {
                titulo: 'Error',
                mensaje: 'Usuario no encontrado en la base de datos',
                codigo: 404
            });
        }
        
        res.render('perfil', {
            titulo: 'Mi Perfil - PapaIA',
            usuario: usuario,
            mensaje: req.session.mensaje || null
        });
        delete req.session.mensaje;
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        res.status(500).render('error', {
            titulo: 'Error',
            mensaje: 'Error al cargar el perfil',
            codigo: 500
        });
    }
});

// Actualizar perfil
router.post('/actualizar', isAuthenticated, upload.single('fotoPerfil'), async (req, res) => {
    try {
        const { 
            nombre, 
            apellido, 
            correo, 
            telefono, 
            dni, 
            direccion, 
            departamento, 
            provincia, 
            distrito, 
            genero, 
            fechaNacimiento,
            contraseñaActual, 
            contraseñaNuevo 
        } = req.body;
        
        const usuarioId = req.session.usuario.id;
        
        console.log('Actualizando perfil para ID:', usuarioId);
        
        const usuario = await Usuario.findById(usuarioId);

        if (!usuario) {
            console.error('Usuario no encontrado para actualizar con ID:', usuarioId);
            return res.status(404).json({ 
                success: false, 
                mensaje: 'Usuario no encontrado' 
            });
        }

        // Actualizar información personal
        if (nombre) usuario.nombre = nombre.trim();
        if (apellido) usuario.apellido = apellido.trim();
        if (correo) usuario.correo = correo.toLowerCase().trim();
        if (genero) usuario.genero = genero;
        if (fechaNacimiento) usuario.fechaNacimiento = new Date(fechaNacimiento);

        // Actualizar información de contacto
        if (telefono) usuario.telefono = telefono.trim();
        if (dni) usuario.dni = dni.trim();

        // Actualizar ubicación
        if (direccion) usuario.direccion = direccion.trim();
        if (departamento || provincia || distrito) {
            usuario.ubicacion = {
                departamento: departamento?.trim() || usuario.ubicacion?.departamento || undefined,
                provincia: provincia?.trim() || usuario.ubicacion?.provincia || undefined,
                distrito: distrito?.trim() || usuario.ubicacion?.distrito || undefined
            };
        }

        // Actualizar foto si se envió
        if (req.file) {
            const photoPath = `/uploads/profiles/${req.file.filename}`;
            usuario.avatarUrl = photoPath;
            console.log('✅ Foto actualizada:', photoPath);
            console.log('📁 Archivo guardado en:', path.join(profilesDir, req.file.filename));
            console.log('📁 Verificando existencia:', fs.existsSync(path.join(profilesDir, req.file.filename)));
        } else {
            console.log('⚠️ No se envió foto nueva. Avatar actual:', usuario.avatarUrl);
        }

        // Cambiar contraseña si se proporciona
        if (contraseñaNuevo && contraseñaActual) {
            const validPassword = await usuario.compararContraseña(contraseñaActual);
            if (!validPassword) {
                return res.status(400).json({ 
                    success: false, 
                    mensaje: 'Contraseña actual incorrecta' 
                });
            }
            usuario.contraseña = contraseñaNuevo;
            console.log('Contraseña actualizada');
        } else if (contraseñaNuevo && !contraseñaActual) {
            return res.status(400).json({ 
                success: false, 
                mensaje: 'Debes ingresar la contraseña actual para cambiarla' 
            });
        }



        // Guardar en la base de datos
        await usuario.save();
        
        console.log('✅ Perfil guardado en BD exitosamente');
        
        // Obtener datos actualizados del usuario
        const usuarioActualizado = await Usuario.findById(usuarioId).lean();
        
        // Actualizar sesión con todos los datos
        req.session.usuario = {
            id: usuarioActualizado._id,
            idUsuario: usuarioActualizado.idUsuario,
            nombre: usuarioActualizado.nombre,
            apellido: usuarioActualizado.apellido || null,
            correo: usuarioActualizado.correo,
            rol: usuarioActualizado.rol,
            avatarUrl: usuarioActualizado.avatarUrl || null,
            telefono: usuarioActualizado.telefono || null,
            dni: usuarioActualizado.dni || null,
            genero: usuarioActualizado.genero,
            fechaNacimiento: usuarioActualizado.fechaNacimiento || null,
            ubicacion: usuarioActualizado.ubicacion || { departamento: '', provincia: '', distrito: '' },
            direccion: usuarioActualizado.direccion || null
        };

        console.log('✅ Perfil actualizado correctamente para:', usuarioActualizado.nombre);
        console.log('📷 Avatar en BD:', usuarioActualizado.avatarUrl);
        console.log('📋 Datos devueltos:', {
            nombre: usuarioActualizado.nombre,
            correo: usuarioActualizado.correo,
            avatarUrl: usuarioActualizado.avatarUrl,
            telefono: usuarioActualizado.telefono,
            dni: usuarioActualizado.dni
        });

        return res.json({ 
            success: true, 
            mensaje: 'Perfil actualizado correctamente',
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.error('❌ Error al actualizar perfil:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({ 
                success: false, 
                mensaje: 'Este correo ya está en uso' 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            mensaje: 'Error al actualizar el perfil: ' + error.message 
        });
    }
}, (err, req, res, next) => {
    // Manejo de errores de multer
    if (err) {
        return res.status(400).json({
            success: false,
            mensaje: err.message || 'Error en la carga de archivo'
        });
    }
});

module.exports = router;