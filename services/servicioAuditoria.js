// Servicio de Auditoría - Registra automáticamente todas las acciones
const RegistroAuditoria = require('../models/RegistroAuditoria');

class ServicioAuditoria {
    
    /**
     * Registra una acción en la auditoría
     * @param {Object} req - Objeto request de Express
     * @param {String} tipoAccion - Tipo de acción realizada
     * @param {String} descripcion - Descripción legible de la acción
     * @param {Object} datosAdicionales - Datos adicionales opcionales
     */
    static async registrarAccion(req, tipoAccion, descripcion, datosAdicionales = {}) {
        try {
            if (!req.session || !req.session.usuario) {
                console.warn('No hay usuario en sesión para registrar auditoría');
                return null;
            }
            
            const datosRegistro = {
                idUsuario: req.session.usuario._id || req.session.usuario.id,
                nombreUsuario: req.session.usuario.nombre,
                tipoAccion: tipoAccion,
                descripcion: descripcion,
                direccionIP: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent'),
                resultado: 'exitoso',
                ...datosAdicionales
            };
            
            return await RegistroAuditoria.registrarAccion(datosRegistro);
        } catch (error) {
            console.error('Error en ServicioAuditoria.registrarAccion:', error);
            return null;
        }
    }
    
    /**
     * Registra un error de acceso
     */
    static async registrarAccesoDenegado(req, razon) {
        try {
            const usuario = req.session?.usuario?.nombre || 'Anónimo';
            const datosRegistro = {
                idUsuario: req.session?.usuario?._id || 'anonimo',
                nombreUsuario: usuario,
                tipoAccion: 'acceso_denegado',
                descripcion: `Acceso denegado: ${razon}`,
                resultado: 'fallido',
                direccionIP: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent')
            };
            
            return await RegistroAuditoria.registrarAccion(datosRegistro);
        } catch (error) {
            console.error('Error registrando acceso denegado:', error);
        }
    }
    
    /**
     * Registra un login
     */
    static async registrarLogin(req, usuario) {
        return this.registrarAccion(req, 'login', `Login exitoso de ${usuario.nombre}`, {
            idUsuario: usuario._id,
            nombreUsuario: usuario.nombre,
            datosRelacionados: {
                correo: usuario.correo,
                rol: usuario.rol
            }
        });
    }
    
    /**
     * Registra un logout
     */
    static async registrarLogout(req) {
        return this.registrarAccion(req, 'logout', `Logout de ${req.session.usuario.nombre}`, {
            datosRelacionados: {
                duracionSesion: req.session.duracion
            }
        });
    }
    
    /**
     * Registra creación de usuario
     */
    static async registrarCreacionUsuario(req, usuarioCreado) {
        return this.registrarAccion(req, 'crear_usuario', 
            `Nuevo usuario creado: ${usuarioCreado.nombre}`,
            {
                tablaAfectada: 'usuarios',
                idObjeto: usuarioCreado._id.toString(),
                estadoNuevo: {
                    nombre: usuarioCreado.nombre,
                    correo: usuarioCreado.correo,
                    rol: usuarioCreado.rol,
                    departamento: usuarioCreado.departamento
                }
            }
        );
    }
    
    /**
     * Registra edición de usuario
     */
    static async registrarEdicionUsuario(req, usuarioAnterior, usuarioNuevo) {
        const cambios = this.detectarCambios(usuarioAnterior, usuarioNuevo);
        
        return this.registrarAccion(req, 'editar_usuario',
            `Usuario actualizado: ${usuarioNuevo.nombre}`,
            {
                tablaAfectada: 'usuarios',
                idObjeto: usuarioNuevo._id.toString(),
                estadoAnterior: usuarioAnterior,
                estadoNuevo: usuarioNuevo,
                datosRelacionados: { cambios }
            }
        );
    }
    
    /**
     * Registra cambio de rol/permisos
     */
    static async registrarCambioRol(req, usuario, rolAnterior, rolNuevo, permisosNuevos) {
        return this.registrarAccion(req, 'cambiar_permisos',
            `Permisos actualizados para ${usuario.nombre}: ${rolAnterior} → ${rolNuevo}`,
            {
                tablaAfectada: 'usuarios',
                idObjeto: usuario._id.toString(),
                estadoAnterior: {
                    rol: rolAnterior,
                    permisos: usuario.permisos
                },
                estadoNuevo: {
                    rol: rolNuevo,
                    permisos: permisosNuevos
                }
            }
        );
    }
    
    /**
     * Registra clasificación de papa
     */
    static async registrarClasificacion(req, clasificacion) {
        return this.registrarAccion(req, 'clasificar_papa',
            `Clasificación realizada: ${clasificacion.variedad} - ${clasificacion.estadoCalidad}`,
            {
                tablaAfectada: 'clasificaciones',
                idObjeto: clasificacion._id.toString(),
                datosRelacionados: {
                    variedad: clasificacion.variedad,
                    estadoCalidad: clasificacion.estadoCalidad,
                    confianza: clasificacion.confianza
                }
            }
        );
    }
    
    /**
     * Registra validación de clasificación
     */
    static async registrarValidacion(req, clasificacion, validada) {
        return this.registrarAccion(req, 'validar_clasificacion',
            `Clasificación ${validada ? 'validada' : 'rechazada'}: ${clasificacion.variedad}`,
            {
                tablaAfectada: 'clasificaciones',
                idObjeto: clasificacion._id.toString(),
                estadoAnterior: {
                    estado: clasificacion.estado
                },
                estadoNuevo: {
                    estado: validada ? 'validada' : 'rechazada'
                }
            }
        );
    }
    
    /**
     * Registra generación de reporte
     */
    static async registrarGeneracionReporte(req, tipoReporte, filtros) {
        return this.registrarAccion(req, 'generar_reporte',
            `Reporte generado: ${tipoReporte}`,
            {
                datosRelacionados: {
                    tipoReporte,
                    filtros
                }
            }
        );
    }
    
    /**
     * Registra exportación de datos
     */
    static async registrarExportacion(req, tipoExportacion, registrosExportados) {
        return this.registrarAccion(req, 'exportar_datos',
            `Datos exportados: ${tipoExportacion} (${registrosExportados} registros)`,
            {
                datosRelacionados: {
                    tipoExportacion,
                    registrosExportados
                }
            }
        );
    }
    
    /**
     * Detecta cambios entre dos objetos
     */
    static detectarCambios(objAnterior, objNuevo) {
        const cambios = {};
        const camposaIgnorar = ['_id', '__v', 'timestamps'];
        
        // Comparar todas las propiedades
        for (const clave in objNuevo) {
            if (camposaIgnorar.includes(clave)) continue;
            
            const anterior = objAnterior[clave];
            const nuevo = objNuevo[clave];
            
            if (JSON.stringify(anterior) !== JSON.stringify(nuevo)) {
                cambios[clave] = {
                    anterior,
                    nuevo
                };
            }
        }
        
        return cambios;
    }
    
    /**
     * Obtiene estadísticas de auditoría para un rango de fechas
     */
    static async obtenerEstadisticas(fechaInicio, fechaFin) {
        try {
            const estadisticas = await RegistroAuditoria.obtenerEstadisticas(fechaInicio, fechaFin);
            
            return {
                success: true,
                estadisticas: estadisticas,
                rangoFechas: {
                    inicio: fechaInicio,
                    fin: fechaFin
                }
            };
        } catch (error) {
            console.error('Error obtenerEstadisticas:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Obtiene últimas acciones de un usuario
     */
    static async obtenerHistorialUsuario(idUsuario, limite = 50) {
        try {
            return await RegistroAuditoria.obtenerRegistrosUsuario(idUsuario, limite);
        } catch (error) {
            console.error('Error obtenerHistorialUsuario:', error);
            return [];
        }
    }
}

module.exports = ServicioAuditoria;
