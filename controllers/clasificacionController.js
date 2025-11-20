// Controlador de Clasificación - Maneja lógica de clasificación IA
const path = require('path');
const fs = require('fs').promises;
const Imagen = require('../models/Imagen');
const Clasificacion = require('../models/Clasificacion');
const VariedadPapa = require('../models/VariedadPapa');
const Trazabilidad = require('../models/Trazabilidad');
const modeloIA = require('../models/ia_model');

class ClasificacionController {
    
    // Mostrar página de clasificación
    static async mostrarClasificar(req, res) {
        try {
            // Verificar autenticación
            if (!req.session.usuario) {
                return res.redirect('/login');
            }
            
            // Obtener información del modelo IA
            const infoModelo = modeloIA.obtenerInfoModelo();
            
            // Obtener variedades disponibles
            const variedades = await VariedadPapa.obtenerActivas();
            
            res.render('clasificar', {
                titulo: 'Clasificar Papa - Sistema IA',
                usuario: req.session.usuario,
                infoModelo,
                variedades,
                error: null,
                resultado: null
            });
            
        } catch (error) {
            console.error('Error mostrando clasificar:', error);
            res.status(500).render('error', {
                mensaje: 'Error cargando página de clasificación',
                codigo: 500
            });
        }
    }

    // Procesar clasificación de imagen
    static async procesarClasificacion(req, res) {
        let rutaImagenTemporal = null;
        
        try {
            console.log('INICIANDO PROCESAMIENTO DE CLASIFICACIÓN');
            console.log(`   Usuario logueado: ${req.session.usuario ? 'SÍ' : 'NO'}`);
            console.log(`   Archivo recibido: ${req.file ? 'SÍ' : 'NO'}`);
            
            // Verificar autenticación
            if (!req.session.usuario) {
                console.log('ERROR: Usuario no autenticado');
                return res.status(401).json({ error: 'No autenticado' });
            }
            
            console.log(`   ID Usuario: ${req.session.usuario.id}`);
            console.log(`   Nombre Usuario: ${req.session.usuario.nombre}`);
            
            // Verificar que se subió un archivo
            if (!req.file) {
                console.log('ERROR: No se proporcionó imagen');
                return res.status(400).json({ error: 'No se proporcionó imagen' });
            }
            
            console.log(`   Archivo: ${req.file.originalname}`);
            console.log(`   Tamaño: ${req.file.size} bytes`);
            console.log(`   Tipo: ${req.file.mimetype}`);
            
            rutaImagenTemporal = req.file.path;
            
            // Validar formato de imagen
            if (!modeloIA.validarImagen(rutaImagenTemporal)) {
                await fs.unlink(rutaImagenTemporal);
                return res.status(400).json({ 
                    error: 'Formato de imagen no válido. Use JPG, PNG o WebP' 
                });
            }
            
            // Verificar que el modelo IA esté disponible
            const infoModelo = modeloIA.obtenerInfoModelo();
            if (!infoModelo.cargado) {
                await fs.unlink(rutaImagenTemporal);
                return res.status(503).json({ 
                    error: 'Modelo IA no disponible. Intente más tarde' 
                });
            }
            
            // Guardar información de la imagen en BD
            // Convertir la ruta a una ruta relativa desde la carpeta public
            const rutaRelativa = req.file.path.replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/') + '/public/', '');
            
            const nuevaImagen = new Imagen({
                urlImagen: rutaRelativa,
                nombreOriginal: req.file.originalname,
                tamaño: req.file.size,
                formato: path.extname(req.file.originalname).substring(1).toLowerCase(),
                usuarioSubida: req.session.usuario.id
            });
            
            await nuevaImagen.save();
            console.log(`✅ Imagen guardada en BD: ${nuevaImagen._id}`);
            console.log(`   - Nombre original: ${req.file.originalname}`);
            console.log(`   - Tamaño: ${req.file.size} bytes`);
            console.log(`   - Usuario: ${req.session.usuario.id}`);
            
            // Realizar predicción con IA
            const prediccion = await modeloIA.predecir(rutaImagenTemporal);
            
            // Buscar variedad predicha en BD
            const variedadEncontrada = await VariedadPapa.findOne({ 
                nombreComun: prediccion.variedadPredicha 
            });
            
            if (!variedadEncontrada) {
                throw new Error(`Variedad ${prediccion.variedadPredicha} no encontrada en base de datos`);
            }
            
            // Determinar condición basada en la confianza
            // Si la confianza es >= 70%, se considera "apto", sino "no apto"
            const condicion = prediccion.confianza >= 0.70 ? 'apto' : 'no apto';
            
            // Guardar clasificación en BD
            const nuevaClasificacion = new Clasificacion({
                idUsuario: req.session.usuario.id,
                idImagen: nuevaImagen._id,
                idVariedad: variedadEncontrada._id,
                confianza: prediccion.confianza,
                condicion: condicion,
                prediccionesAlternativas: await Promise.all(
                    prediccion.todasPredicciones.slice(1, 3).map(async (pred) => {
                        const variedad = await VariedadPapa.findOne({ 
                            nombreComun: pred.variedad 
                        });
                        return variedad ? {
                            variedad: variedad._id,
                            confianza: pred.confianza
                        } : null;
                    })
                ).then(results => results.filter(Boolean)),
                tiempoProcesamientoMs: prediccion.tiempoProcesamientoMs,
                metadatosIA: prediccion.metadatos
            });
            
            await nuevaClasificacion.save();
            console.log(`✅ Clasificación guardada en BD: ${nuevaClasificacion._id}`);
            console.log(`   - Usuario: ${req.session.usuario.id}`);
            console.log(`   - Variedad: ${variedadEncontrada.nombreComun}`);
            console.log(`   - Confianza: ${Math.round(prediccion.confianza * 100)}%`);
            console.log(`   - Condición: ${condicion}`);
            
            // Crear registro de trazabilidad
            await Trazabilidad.crearRegistro({
                idClasificacion: nuevaClasificacion._id,
                responsable: req.session.usuario.id,
                accion: 'clasificacion_creada',
                observaciones: `Clasificación automática: ${prediccion.variedadPredicha} con ${prediccion.confianzaPorcentaje}% de confianza`,
                datosNuevos: {
                    variedad: prediccion.variedadPredicha,
                    confianza: prediccion.confianza
                },
                metadatos: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            
            // Marcar imagen como procesada
            nuevaImagen.procesada = true;
            await nuevaImagen.save();
            
            // Preparar respuesta con toda la información
            const respuesta = {
                success: true,
                exito: true, // Mantener compatibilidad
                resultado: {
                    idClasificacion: nuevaClasificacion.idClasificacion,
                    variedad: {
                        nombre: variedadEncontrada.nombreComun,
                        cientifico: variedadEncontrada.nombreCientifico,
                        descripcion: variedadEncontrada.descripcion
                    },
                    confianza: prediccion.confianza,
                    confianzaPorcentaje: prediccion.confianzaPorcentaje,
                    condicion: condicion, // Agregar condición a la respuesta
                    alternativas: prediccion.todasPredicciones.slice(1, 3),
                    tiempoProcesamiento: prediccion.tiempoProcesamientoMs,
                    imagen: {
                        url: nuevaImagen.urlImagen,
                        nombre: nuevaImagen.nombreOriginal
                    },
                    fechaClasificacion: nuevaClasificacion.fechaClasificacion,
                    metodo: `${infoModelo.tipo} - ${infoModelo.estado}`
                }
            };
            
            console.log(`✅ CLASIFICACIÓN COMPLETADA EXITOSAMENTE`);
            console.log(`   Variedad: ${prediccion.variedadPredicha} (${prediccion.confianzaPorcentaje}%)`);
            console.log(`   ID Clasificación: ${nuevaClasificacion._id}`);
            console.log(`   Condición: ${condicion}`);
            console.log('🚀 ENVIANDO RESPUESTA AL FRONTEND...\n');
            
            res.json(respuesta);
            
        } catch (error) {
            console.error('Error procesando clasificación:', error);
            
            // Limpiar archivo temporal si existe
            if (rutaImagenTemporal) {
                try {
                    await fs.unlink(rutaImagenTemporal);
                } catch (unlinkError) {
                    console.error('Error eliminando archivo temporal:', unlinkError);
                }
            }
            
            res.status(500).json({ 
                error: 'Error procesando clasificación: ' + error.message 
            });
        }
    }

    // Obtener historial de clasificaciones del usuario
    static async obtenerHistorial(req, res) {
        try {
            if (!req.session.usuario) {
                return res.status(401).json({ error: 'No autenticado' });
            }
            
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            
            const clasificaciones = await Clasificacion.find({ 
                idUsuario: req.session.usuario.id 
            })
            .populate('idImagen', 'urlImagen nombreOriginal fechaSubida')
            .populate('idVariedad', 'nombreComun nombreCientifico')
            .sort({ fechaClasificacion: -1 })
            .limit(limit)
            .skip(skip);
            
            const total = await Clasificacion.countDocuments({ 
                idUsuario: req.session.usuario.id 
            });
            
            res.json({
                clasificaciones,
                paginacion: {
                    total,
                    pagina: page,
                    limiteporPagina: limit,
                    totalPaginas: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            res.status(500).json({ error: 'Error obteniendo historial' });
        }
    }

    // Validar clasificación (solo administradores)
    static async validarClasificacion(req, res) {
        try {
            if (!req.session.usuario || req.session.usuario.rol !== 'administrador') {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }
            
            const { idClasificacion } = req.params;
            const { observaciones } = req.body;
            
            const clasificacion = await Clasificacion.findById(idClasificacion);
            
            if (!clasificacion) {
                return res.status(404).json({ error: 'Clasificación no encontrada' });
            }
            
            await clasificacion.validar(req.session.usuario.id, observaciones);
            
            // Crear registro de trazabilidad
            await Trazabilidad.crearRegistro({
                idClasificacion: clasificacion._id,
                responsable: req.session.usuario.id,
                accion: 'clasificacion_validada',
                observaciones: observaciones || 'Clasificación validada por administrador',
                metadatos: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            
            res.json({ mensaje: 'Clasificación validada exitosamente' });
            
        } catch (error) {
            console.error('Error validando clasificación:', error);
            res.status(500).json({ error: 'Error validando clasificación' });
        }
    }

    // Obtener estado del modelo IA
    static async obtenerEstadoModelo(req, res) {
        try {
            const infoModelo = modeloIA.obtenerInfoModelo();
            res.json(infoModelo);
        } catch (error) {
            console.error('Error obteniendo estado del modelo:', error);
            res.status(500).json({ error: 'Error obteniendo estado del modelo' });
        }
    }

    // Mostrar vista de estado y entrenamiento del modelo (interfaz web)
    static async mostrarEstadoModeloView(req, res) {
        try {
            if (!req.session.usuario) {
                return res.redirect('/login');
            }

            const infoModelo = modeloIA.obtenerInfoModelo();
            res.render('modelo-ia', {
                titulo: 'Estado y Entrenamiento - Modelo IA',
                usuario: req.session.usuario,
                infoModelo
            });
        } catch (error) {
            console.error('Error mostrando vista de estado del modelo:', error);
            res.status(500).render('error', {
                mensaje: 'Error mostrando estado del modelo',
                codigo: 500
            });
        }
    }

    // Entrenar modelo IA (simulado) - solo administradores
    static async entrenarModelo(req, res) {
        try {
            if (!req.session.usuario || req.session.usuario.rol !== 'administrador') {
                return res.status(403).json({ error: 'Sin permisos suficientes' });
            }

            const opciones = req.body || {};
            // Registrar en auditoría que se inició entrenamiento
            const ServicioAuditoria = require('../services/servicioAuditoria');
            try {
                await ServicioAuditoria.registrarAccion(req, 'entrenar_modelo', `Inicio de entrenamiento del modelo IA`, {
                    datosRelacionados: { opciones }
                });
            } catch (e) {
                console.warn('No se pudo registrar auditoría de inicio de entrenamiento:', e && e.message);
            }

            const resultado = await modeloIA.entrenarModelo(opciones);

            // Registrar finalización en auditoría
            try {
                await ServicioAuditoria.registrarAccion(req, 'entrenar_modelo', `Entrenamiento completado: ${resultado.version}`, {
                    datosRelacionados: { resultado }
                });
            } catch (e) {
                console.warn('No se pudo registrar auditoría de fin de entrenamiento:', e && e.message);
            }

            res.json({ success: true, detalle: resultado });
        } catch (error) {
            console.error('Error en entrenarModelo:', error);
            res.status(500).json({ error: 'Error entrenando modelo: ' + error.message });
        }
    }
}

module.exports = ClasificacionController;