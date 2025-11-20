/**
 * ========================================
 * DASHBOARD - INICIALIZACIÓN
 * ========================================
 * 
 * Archivo: dashboard-init.js
 * Propósito: Inicializar componentes y configurar eventos
 * 
 * Funciones:
 * - initializeDashboard(): Función principal de inicialización
 * - loadInitialData(): Cargar datos iniciales
 * ========================================
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('[DASHBOARD] Inicializando dashboard...');
    initializeDashboard();
});

/**
 * Inicializa todos los componentes del dashboard
 */
function initializeDashboard() {
    try {
        // 1. Cargar datos iniciales
        loadInitialData();
        
        // 2. Inicializar gráficos (desde dashboard-charts.js) - PRIMERO
        if (typeof inicializarGraficos === 'function') {
            inicializarGraficos();
        }
        
        // 3. Configurar eventos de filtros (desde dashboard-filters.js) - DESPUÉS
        if (typeof configurarEventosFiltros === 'function') {
            configurarEventosFiltros();
        }
        
        console.log('[DASHBOARD] Dashboard inicializado correctamente');
    } catch (error) {
        console.error('[DASHBOARD] Error al inicializar:', error);
    }
}

/**
 * Cargar datos iniciales del servidor
 */
function loadInitialData() {
    try {
        // Los datos vienen del servidor en variables globales:
        // - window.datosVariedades
        // - window.datosStats
        // - window.datosTemporales
        // - window.distribucionConfianza
        
        console.log('[DATA] Datos cargados del servidor:', {
            variedades: window.datosVariedades?.length || 0,
            stats: window.datosStats,
            temporales: window.datosTemporales?.length || 0,
            confianza: Object.keys(window.distribucionConfianza || {})
        });
        
    } catch (error) {
        console.error('[DATA] Error al cargar datos iniciales:', error);
    }
}

