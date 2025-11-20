/**
 * ========================================
 * DASHBOARD - CONFIGURACIÓN GLOBAL
 * ========================================
 * 
 * Archivo: dashboard-config.js
 * Propósito: Variables globales, colores, configuración centralizada
 * Uso: Importar en dashboard.ejs antes de otros scripts
 * 
 * Estructura:
 * - Colores y temas
 * - Configuración de animaciones
 * - URLs de API
 * - Constantes globales
 * ========================================
 */

// ========== CONFIGURACIÓN GLOBAL DEL DASHBOARD ==========
const DASHBOARD_CONFIG = {
    // ===== COLORES Y TEMAS =====
    colores: {
        variedad: {
            amarilla: '#FFD700',
            huayro: '#8B4513',
            peruanita: '#DEB887',
            default1: '#28a745',
            default2: '#007bff',
            default3: '#ffc107',
            default4: '#dc3545',
            default5: '#17a2b8'
        },
        estado: {
            apto: '#28a745',
            noApto: '#dc3545'
        },
        ui: {
            primary: '#28a745',
            secondary: '#6c757d',
            success: '#48bb78',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8',
            light: '#f8fdf9',
            dark: '#2d5016'
        },
        text: {
            primary: '#2d3748',
            secondary: '#718096',
            light: '#cbd5e0',
            muted: '#a0aec0'
        }
    },
    
    // ===== ANIMACIONES =====
    animacion: {
        duracion: 800,
        ease: 'easeInOutQuad'
    },
    
    // ===== API ENDPOINTS =====
    api: {
        filtrar: '/reportes/filtrar',
        estadisticas: '/reportes/estadisticas',
        exportar: '/reportes/exportar'
    },
    
    // ===== CONFIGURACIÓN DE GRÁFICOS ==========
    charts: {
        font: {
            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI'",
            size: 12,
            weight: '500'
        },
        animationDuration: 800,
        responsive: true,
        maintainAspectRatio: true
    },
    
    // ===== FILTROS POR DEFECTO =====
    filtros: {
        // Fecha inicio por defecto: hace 30 días
        fechaInicio: new Date(new Date().setDate(new Date().getDate() - 30)),
        // Fecha fin por defecto: hoy
        fechaFin: new Date(),
        variedad: '',
        condicion: ''
    },
    
    // ===== MENSAJES Y TEXTOS =====
    mensajes: {
        cargando: 'Cargando datos...',
        error: 'Error al cargar los datos',
        sinDatos: 'Sin datos disponibles',
        filtrosAplicados: 'Filtros aplicados correctamente',
        errorFiltros: 'Error al aplicar filtros'
    },
    
    // ===== MODO DEBUG =====
    debug: true
};

// ========== FUNCIÓN HELPER: LOG CON PREFIJO ==========
/**
 * Log con prefijo personalizado para debugging
 * @param {string} modulo - Nombre del módulo
 * @param {string} mensaje - Mensaje a mostrar
 * @param {any} datos - Datos opcionales
 */
function debugLog(modulo, mensaje, datos = null) {
    if (DASHBOARD_CONFIG.debug) {
        const timestamp = new Date().toLocaleTimeString('es-PE');
        const prefix = `[${timestamp}] [${modulo}]`;
        
        if (datos) {
            console.log(`${prefix} ${mensaje}`, datos);
        } else {
            console.log(`${prefix} ${mensaje}`);
        }
    }
}

// ========== FUNCIÓN HELPER: FORMATO DE FECHAS ==========
/**
 * Convierte una fecha al formato ISO para inputs de tipo date
 * @param {Date} date - Fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function formatoFechaISO(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
}

// ========== FUNCIÓN HELPER: FORMATO DE NÚMEROS ==========
/**
 * Formatea un número según la localidad
 * @param {number} numero - Número a formatear
 * @param {number} decimales - Decimales a mostrar (default: 0)
 * @returns {string} Número formateado
 */
function formatoNumero(numero, decimales = 0) {
    return numero.toLocaleString('es-PE', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

// ========== FUNCIÓN HELPER: FORMATO DE PORCENTAJE ==========
/**
 * Convierte un decimal a porcentaje
 * @param {number} valor - Valor decimal (0-1)
 * @param {number} decimales - Decimales a mostrar (default: 1)
 * @returns {string} Porcentaje formateado
 */
function formatoPorcentaje(valor, decimales = 1) {
    return (valor * 100).toFixed(decimales) + '%';
}

// ========== FUNCIÓN HELPER: MOSTRAR ALERTA ==========
/**
 * Muestra una alerta Bootstrap al usuario
 * @param {string} tipo - 'success', 'danger', 'warning', 'info'
 * @param {string} mensaje - Mensaje a mostrar
 * @param {number} duracion - Duración en ms (0 = permanente)
 */
function mostrarAlerta(tipo, mensaje, duracion = 5000) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.role = 'alert';
    alerta.innerHTML = `
        <strong>${tipo === 'success' ? '✓' : tipo === 'danger' ? '✗' : 'ℹ'}</strong> ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const contenedor = document.querySelector('.main-content');
    if (contenedor) {
        contenedor.insertBefore(alerta, contenedor.firstChild);
        
        // Auto-remover si tiene duración definida
        if (duracion > 0) {
            setTimeout(() => {
                alerta.classList.remove('show');
                setTimeout(() => alerta.remove(), 150);
            }, duracion);
        }
    }
}

// ========== FUNCIÓN HELPER: MOSTRAR CARGANDO ==========
/**
 * Muestra/oculta un indicador de carga en un botón
 * @param {string} elementId - ID del elemento botón
 * @param {boolean} loading - true = mostrar carga, false = ocultar
 * @param {string} textoOriginal - Texto original del botón
 */
function mostrarCargando(elementId, loading, textoOriginal = '') {
    const elemento = document.getElementById(elementId);
    if (!elemento) return;
    
    if (loading) {
        elemento.disabled = true;
        elemento.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Cargando...';
    } else {
        elemento.disabled = false;
        elemento.innerHTML = textoOriginal || elemento.innerHTML;
    }
}

// ========== INICIALIZAR CHART.JS CON CONFIGURACIÓN GLOBAL ==========
if (typeof Chart !== 'undefined') {
    // Configurar globales de Chart.js
    Chart.defaults.font.family = DASHBOARD_CONFIG.charts.font.family;
    Chart.defaults.font.size = DASHBOARD_CONFIG.charts.font.size;
    
    // Colores por defecto
    Chart.defaults.color = DASHBOARD_CONFIG.colores.text.secondary;
    Chart.defaults.borderColor = '#e9ecef';
}

debugLog('CONFIG', '✅ Configuración global cargada');
