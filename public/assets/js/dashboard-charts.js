/**
 * ========================================
 * DASHBOARD - GRÁFICOS INTERACTIVOS
 * ========================================
 * 
 * Archivo: dashboard-charts.js
 * Propósito: Crear y actualizar gráficos con Chart.js
 * Dependencias: Chart.js, dashboard-config.js
 * 
 * Gráficos:
 * 1. Distribución por Variedad (Doughnut)
 * 2. Estado de Clasificaciones (Doughnut)
 * ========================================
 */

// ========== OBJETOS GLOBALES PARA INSTANCIAS DE GRÁFICOS ==========
let chartVariedadesBarras = null;  // Bar chart - Clasificaciones por variedad
let chartCondiciones = null;        // Donut chart - Apto vs No Apto
let chartTendencia = null;          // Line chart - Tendencia temporal
let chartConfianza = null;          // Bar chart - Distribución por confianza

// ========================================
// FUNCIÓN: INICIALIZAR TODOS LOS GRÁFICOS
// ========================================
/**
 * Inicializa los gráficos con los datos actuales
 * Se ejecuta después de cargar la página
 */
function inicializarGraficos() {
    debugLog('CHARTS', 'Inicializando todos los gráficos...');
    
    try {
        // Obtener datos del servidor
        const datosVariedades = window.datosVariedades || [];
        const datosStats = window.datosStats || { aptos: 0, noAptos: 0 };
        
        // Crear gráficos si existen sus canvas
        if (document.getElementById('chartVariedadesBarras')) {
            crearGraficoVariedadesBarras(datosVariedades);
        }
        
        if (document.getElementById('chartCondiciones')) {
            crearGraficoCondiciones(datosStats);
        }
        
        if (document.getElementById('chartTendencia')) {
            crearGraficoTendenciaTemporal();
        }
        
        if (document.getElementById('chartConfianza')) {
            crearGraficoConfianza();
        }
        
        debugLog('CHARTS', '✅ Todos los gráficos inicializados correctamente');
    } catch (error) {
        debugLog('CHARTS', '❌ Error al inicializar gráficos:', error);
        mostrarAlerta('danger', 'Error al cargar los gráficos');
    }
}

// ========================================
// FUNCIÓN: CREAR GRÁFICO DE CONDICIONES
// ========================================
/**
 * Crea un gráfico doughnut con la distribución de condiciones (apto/no apto)
 * @param {Object} datos - Objeto con propiedades aptos y noAptos
 */
function crearGraficoCondiciones(datos) {
    const canvas = document.getElementById('chartCondiciones');
    if (!canvas) return;
    
    debugLog('CHARTS', 'Creando gráfico de condiciones...', datos);
    
    // Destruir gráfico anterior si existe
    if (chartCondiciones) {
        chartCondiciones.destroy();
    }
    
    const aptos = datos.aptos || 0;
    const noAptos = datos.noAptos || 0;
    const total = aptos + noAptos;
    
    // Crear gráfico
    const ctx = canvas.getContext('2d');
    chartCondiciones = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['✅ Aptas', '❌ No Aptas'],
            datasets: [{
                label: 'Clasificaciones',
                data: [aptos, noAptos],
                backgroundColor: [
                    DASHBOARD_CONFIG.colores.estado.apto,
                    DASHBOARD_CONFIG.colores.estado.noApto
                ],
                borderColor: '#fff',
                borderWidth: 2,
                hoverBorderColor: '#333',
                hoverBorderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { 
                            size: 12, 
                            weight: '600'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        generateLabels: function(chart) {
                            const data = chart.data;
                            const labels = data.labels;
                            const dataset = data.datasets[0];
                            
                            return labels.map((label, i) => {
                                const value = dataset.data[i];
                                const total = dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                
                                return {
                                    text: `${label} (${value} - ${percentage}%)`,
                                    fillStyle: dataset.backgroundColor[i],
                                    hidden: false,
                                    index: i,
                                    pointStyle: 'circle'
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    padding: 12,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    displayColors: true,
                    borderColor: '#ddd',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return ` ${value} papas (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                duration: DASHBOARD_CONFIG.animacion.duracion
            }
        }
    });
    
    debugLog('CHARTS', '✅ Gráfico de condiciones creado');
}

// ========================================
// FUNCIÓN: ACTUALIZAR GRÁFICOS CON DATOS NUEVOS
// ========================================
/**
 * Actualiza los gráficos con nuevos datos (después de filtrar)
 * @param {Array} datosVariedades - Nuevos datos de variedades
 * @param {Object} datosCondiciones - Nuevos datos de condiciones
 */
function actualizarGraficos(datosVariedades, datosCondiciones) {
    debugLog('CHARTS', 'Actualizando gráficos con nuevos datos...');
    
    try {
        // Actualizar gráfico de variedades (barras)
        if (chartVariedadesBarras && datosVariedades) {
            const etiquetas = datosVariedades.map(item => item.nombreComun || 'Sin nombre');
            const cantidades = datosVariedades.map(item => item.cantidad || 0);
            
            chartVariedadesBarras.data.labels = etiquetas;
            chartVariedadesBarras.data.datasets[0].data = cantidades;
            chartVariedadesBarras.update('none'); // Update sin animación
        }
        
        // Actualizar gráfico de condiciones
        if (chartCondiciones && datosCondiciones) {
            const aptos = datosCondiciones.aptos || 0;
            const noAptos = datosCondiciones.noAptos || 0;
            
            chartCondiciones.data.datasets[0].data = [aptos, noAptos];
            chartCondiciones.update('none'); // Update sin animación
        }
        
        debugLog('CHARTS', '✅ Gráficos actualizados correctamente');
    } catch (error) {
        debugLog('CHARTS', '❌ Error al actualizar gráficos:', error);
    }
}

// ========================================
// FUNCIÓN: DESTRUIR GRÁFICOS
// ========================================
/**
 * Destruye las instancias de gráficos (útil para limpiar memoria)
 */
function destruirGraficos() {
    if (chartVariedadesBarras) {
        chartVariedadesBarras.destroy();
        chartVariedadesBarras = null;
    }
    if (chartCondiciones) {
        chartCondiciones.destroy();
        chartCondiciones = null;
    }
    if (chartTendencia) {
        chartTendencia.destroy();
        chartTendencia = null;
    }
    if (chartConfianza) {
        chartConfianza.destroy();
        chartConfianza = null;
    }
    debugLog('CHARTS', '✅ Todos los gráficos destruidos');
}

// ========================================
// FUNCIÓN: CREAR GRÁFICO DE BARRAS - VARIEDADES
// ========================================
/**
 * Crea un gráfico de barras con la distribución de clasificaciones por variedad
 */
function crearGraficoVariedadesBarras(datos) {
    const canvas = document.getElementById('chartVariedadesBarras');
    if (!canvas) return;
    
    debugLog('CHARTS', 'Creando gráfico de barras de variedades...');
    
    if (chartVariedadesBarras) {
        chartVariedadesBarras.destroy();
    }
    
    // Mapeo de colores específicos por variedad
    const coloresPorVariedad = {
        'amarilla': DASHBOARD_CONFIG.colores.variedad.amarilla,
        'huayro': DASHBOARD_CONFIG.colores.variedad.huayro,
        'peruanita': DASHBOARD_CONFIG.colores.variedad.peruanita
    };
    
    const etiquetas = datos.map(item => item.nombreComun || 'Sin nombre');
    const cantidades = datos.map(item => item.cantidad || 0);
    const colores = datos.map(item => {
        const nombreComun = item.nombreComun || '';
        return coloresPorVariedad[nombreComun.toLowerCase()] || DASHBOARD_CONFIG.colores.ui.primary;
    });
    
    const ctx = canvas.getContext('2d');
    chartVariedadesBarras = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Clasificaciones',
                data: cantidades,
                backgroundColor: colores,
                borderColor: colores.map(c => c),
                borderWidth: 1,
                borderRadius: 5,
                hoverBackgroundColor: colores.map(c => c)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'Clasificaciones: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { font: { size: 11 } }
                },
                x: {
                    ticks: { font: { size: 11 } }
                }
            },
            animation: {
                duration: DASHBOARD_CONFIG.animacion.duracion
            }
        }
    });
    
    debugLog('CHARTS', '✅ Gráfico de barras de variedades creado');
}

// ========================================
// FUNCIÓN: CREAR GRÁFICO DE LÍNEAS - TENDENCIA TEMPORAL
// ========================================
/**
 * Crea un gráfico de líneas mostrando la tendencia temporal de clasificaciones
 */
function crearGraficoTendenciaTemporal() {
    const canvas = document.getElementById('chartTendencia');
    if (!canvas) return;
    
    debugLog('CHARTS', 'Creando gráfico de tendencia temporal...');
    
    if (chartTendencia) {
        chartTendencia.destroy();
    }
    
    // Obtener datos reales del servidor
    const datosTemporales = window.datosTemporales || [];
    
    // Extraer fechas y cantidades
    const fechas = datosTemporales.map(d => {
        const fecha = new Date(d.fecha);
        return (fecha.getDate()) + '/' + (fecha.getMonth() + 1);
    });
    const datos = datosTemporales.map(d => d.cantidad);
    
    const ctx = canvas.getContext('2d');
    chartTendencia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fechas,
            datasets: [{
                label: 'Clasificaciones por día',
                data: datos,
                borderColor: DASHBOARD_CONFIG.colores.ui.primary,
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true,
                borderWidth: 2,
                tension: 0.4,
                pointBackgroundColor: DASHBOARD_CONFIG.colores.ui.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 12, weight: '600' },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    padding: 10,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return 'Clasificaciones: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { font: { size: 11 } }
                },
                x: {
                    ticks: { font: { size: 11 } }
                }
            },
            animation: {
                duration: DASHBOARD_CONFIG.animacion.duracion
            }
        }
    });
    
    debugLog('CHARTS', '✅ Gráfico de tendencia temporal creado');
}

// ========================================
// FUNCIÓN: CREAR GRÁFICO DE BARRAS - DISTRIBUCIÓN CONFIANZA
// ========================================
/**
 * Crea un gráfico de barras mostrando la distribución de niveles de confianza
 */
function crearGraficoConfianza() {
    const canvas = document.getElementById('chartConfianza');
    if (!canvas) return;
    
    debugLog('CHARTS', 'Creando gráfico de distribución de confianza...');
    
    if (chartConfianza) {
        chartConfianza.destroy();
    }
    
    // Obtener datos reales del servidor
    const datosConfianza = window.distribucionConfianza || {};
    
    // Rangos de confianza (en % )
    const rangos = ['90-100%', '80-90%', '70-80%', '60-70%', '<60%'];
    const cantidades = [
        datosConfianza.rango90_100 || 0,
        datosConfianza.rango80_90 || 0,
        datosConfianza.rango70_80 || 0,
        datosConfianza.rango60_70 || 0,
        datosConfianza.rangoMenor60 || 0
    ];
    
    const colores = [
        DASHBOARD_CONFIG.colores.ui.success,  // Verde (90%+)
        DASHBOARD_CONFIG.colores.ui.info,     // Azul (80%)
        DASHBOARD_CONFIG.colores.ui.warning,  // Amarillo (70%)
        DASHBOARD_CONFIG.colores.ui.danger,   // Rojo (60%)
        '#999'                                  // Gris (<60%)
    ];
    
    const ctx = canvas.getContext('2d');
    chartConfianza = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rangos,
            datasets: [{
                label: 'Cantidad de clasificaciones',
                data: cantidades,
                backgroundColor: colores,
                borderRadius: 5,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 12, weight: '600' },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return 'Clasificaciones: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { font: { size: 11 } }
                },
                x: {
                    ticks: { font: { size: 11 } }
                }
            },
            animation: {
                duration: DASHBOARD_CONFIG.animacion.duracion
            }
        }
    });
    
    debugLog('CHARTS', '✅ Gráfico de confianza creado');
}

debugLog('CHARTS', '✅ Script de gráficos cargado');
