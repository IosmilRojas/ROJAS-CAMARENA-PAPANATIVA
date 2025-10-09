// Modelo IA - Simulación para desarrollo sin TensorFlow Node
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ModeloIA {
    constructor() {
        this.modelo = null;
        this.clases = ['amarilla', 'huayro', 'peruanita']; // Variedades de papa
        this.inputShape = [224, 224, 3]; // Dimensiones de entrada MobileNetV2
        this.modeloPath = path.join(__dirname, '../web_model/model.json');
        this.cargado = false;
    }

    // Cargar modelo preentrenado (simulado para desarrollo)
    async cargarModelo() {
        try {
            console.log('Inicializando modelo IA (modo simulación)...');
            
            // Simulación del modelo para desarrollo
            this.modelo = {
                predict: this.simularPrediccion.bind(this)
            };
            this.cargado = true;
            
            console.log('Modelo IA simulado cargado exitosamente');
            console.log('Forma de entrada esperada: [224, 224, 3]');
            console.log('Clases disponibles:', this.clases);
            
            return true;
        } catch (error) {
            console.error('Error cargando modelo IA:', error.message);
            this.cargado = false;
            return false;
        }
    }

    // Simulación de predicción para desarrollo
    simularPrediccion() {
        // Generar predicciones simuladas realistas
        const predicciones = [];
        let total = 0;
        
        // Generar valores aleatorios para cada clase
        this.clases.forEach(() => {
            const valor = Math.random();
            predicciones.push(valor);
            total += valor;
        });
        
        // Normalizar para que sumen 1 (probabilidades)
        const probabilidades = predicciones.map(p => p / total);
        
        return {
            arraySync: () => [probabilidades]
        };
    }

    // Preprocesar imagen (simplificado para desarrollo)
    async preprocesarImagen(rutaImagen) {
        try {
            // Solo redimensionar la imagen para validación
            const buffer = await sharp(rutaImagen)
                .resize(this.inputShape[0], this.inputShape[1])
                .removeAlpha()
                .jpeg({ quality: 90 })
                .toBuffer();

            return {
                dispose: () => {}, // Método dummy para compatibilidad
                shape: [1, this.inputShape[0], this.inputShape[1], this.inputShape[2]]
            };
        } catch (error) {
            console.error('Error preprocesando imagen:', error.message);
            throw error;
        }
    }

    // Realizar predicción (simulada para desarrollo)
    async predecir(rutaImagen) {
        if (!this.cargado) {
            throw new Error('Modelo no cargado. Ejecute cargarModelo() primero.');
        }

        const tiempoInicio = Date.now();
        
        try {
            // Validar imagen
            await this.preprocesarImagen(rutaImagen);
            
            // Realizar predicción simulada
            const prediccion = this.modelo.predict();
            const resultados = prediccion.arraySync()[0];
            
            // Procesar resultados
            const confianzas = Array.from(resultados);
            const indiceMaximo = confianzas.indexOf(Math.max(...confianzas));
            const variedadPredicha = this.clases[indiceMaximo];
            const confianzaMaxima = confianzas[indiceMaximo];
            
            // Crear array de todas las predicciones
            const todasPredicciones = confianzas.map((confianza, indice) => ({
                variedad: this.clases[indice],
                confianza: confianza,
                porcentaje: Math.round(confianza * 100)
            })).sort((a, b) => b.confianza - a.confianza);
            
            const tiempoProcesamiento = Date.now() - tiempoInicio;
            
            return {
                variedadPredicha,
                confianza: confianzaMaxima,
                confianzaPorcentaje: Math.round(confianzaMaxima * 100),
                todasPredicciones,
                tiempoProcesamientoMs: tiempoProcesamiento,
                metadatos: {
                    modeloVersion: '1.0',
                    algoritmo: 'MobileNetV2',
                    fechaPrediccion: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('Error durante predicción:', error.message);
            throw error;
        }
    }

    // Obtener información del modelo
    obtenerInfoModelo() {
        if (!this.cargado) {
            return {
                cargado: false,
                mensaje: 'Modelo no disponible'
            };
        }
        
        return {
            cargado: true,
            clases: this.clases,
            inputShape: this.inputShape,
            totalParametros: 1000000, // Valor simulado
            capas: 10 // Valor simulado
        };
    }

    // Validar formato de imagen
    validarImagen(rutaArchivo) {
        const extensionesPermitidas = ['.jpg', '.jpeg', '.png', '.webp'];
        const extension = path.extname(rutaArchivo).toLowerCase();
        
        return extensionesPermitidas.includes(extension);
    }
}

// Crear instancia singleton del modelo
const modeloIA = new ModeloIA();

// Cargar modelo al inicializar
modeloIA.cargarModelo().catch(error => {
    console.error('Error inicializando modelo IA:', error.message);
});

module.exports = modeloIA;