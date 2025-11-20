/**
 * ========================================
 * DASHBOARD - GESTIÓN DE FILTROS
 * ========================================
 * 
 * Archivo: dashboard-filters.js
 * Propósito: Aplicar filtros, hacer llamadas AJAX, actualizar datos
 * Dependencias: dashboard-config.js, dashboard-charts.js
 * 
 * Funciones:
 * 1. Configurar eventos de filtros
 * 2. Aplicar filtros con validación
 * 3. Limpiar filtros
 * 4. Manejar respuestas AJAX
 * ========================================
 */

// ========== VARIABLES GLOBALES DE FILTROS ==========
let filtroActual = {
    fechaInicio: null,
    fechaFin: null,
    variedad: '',
    condicion: ''
};

// ========================================
// FUNCIÓN: CONFIGURAR EVENTOS DE FILTROS
// ========================================
/**
 * Inicializa los eventos de los controles de filtro
 * Se ejecuta cuando el DOM está listo
 */
function configurarEventosFiltros() {
    debugLog('FILTERS', 'Configurando eventos de filtros...');
    
    const btnAplicar = document.getElementById('btn-apply-filters');
    const btnLimpiar = document.getElementById('btn-clear-filters');
    const inputFechaInicio = document.getElementById('fecha-inicio');
    const inputFechaFin = document.getElementById('fecha-fin');
    
    // Botón Aplicar Filtros
    if (btnAplicar) {
        btnAplicar.addEventListener('click', aplicarFiltros);
    }
    
    // Botón Limpiar Filtros
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
    
    // Permitir aplicar filtros con Enter
    if (inputFechaInicio || inputFechaFin) {
        document.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                aplicarFiltros();
            }
        });
    }
    
    debugLog('FILTERS', '✅ Eventos de filtros configurados');
}

// ========================================
// FUNCIÓN: APLICAR FILTROS
// ========================================
/**
 * Obtiene los valores de los filtros, valida y hace AJAX
 */
async function aplicarFiltros() {
    debugLog('FILTERS', 'Aplicando filtros...');
    
    try {
        // Obtener valores del formulario (usando los IDs correctos)
        const fechaInicio = document.getElementById('fecha-inicio')?.value || '';
        const fechaFin = document.getElementById('fecha-fin')?.value || '';
        const variedad = document.getElementById('variedad')?.value || '';
        const condicion = document.getElementById('condicion')?.value || '';
        
        // Validar rangos de fecha
        if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
            mostrarAlerta('warning', 'La fecha inicio no puede ser mayor que la fecha fin');
            return;
        }
        
        // Guardar filtros actuales
        filtroActual = { fechaInicio, fechaFin, variedad, condicion };
        
        debugLog('FILTERS', 'Filtros a aplicar:', filtroActual);
        
        // Mostrar estado de carga
        const btnAplicar = document.getElementById('btn-apply-filters');
        const textoOriginal = btnAplicar.innerHTML;
        mostrarCargando('btn-apply-filters', true, textoOriginal);
        
        // Hacer llamada AJAX al backend
        const respuesta = await fetch(DASHBOARD_CONFIG.api.filtrar, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(filtroActual),
            credentials: 'include' // Incluir cookies de sesión
        });
        
        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}: ${respuesta.statusText}`);
        }
        
        const datos = await respuesta.json();
        
        if (!datos.exito) {
            throw new Error(datos.error || 'Error desconocido');
        }
        
        debugLog('FILTERS', '✅ Datos recibidos del servidor:', datos);
        
        // Actualizar gráficos y datos
        procesarRespuestaFiltros(datos);
        
        // Mostrar confirmación
        mostrarAlerta('success', 
            `Filtros aplicados: ${datos.estadisticas.total} registros encontrados`, 
            4000);
        
    } catch (error) {
        debugLog('FILTERS', '❌ Error al aplicar filtros:', error);
        mostrarAlerta('danger', 
            `Error: ${error.message || DASHBOARD_CONFIG.mensajes.errorFiltros}`);
    } finally {
        // Restaurar botón
        const btnAplicar = document.getElementById('btn-apply-filters');
        if (btnAplicar) {
            mostrarCargando('btn-apply-filters', false, 
                '<i class="fas fa-check me-2"></i>Aplicar');
        }
    }
}

// ========================================
// FUNCIÓN: PROCESAR RESPUESTA DE FILTROS
// ========================================
/**
 * Procesa la respuesta del servidor y actualiza el dashboard
 * @param {Object} datos - Respuesta del servidor
 */
function procesarRespuestaFiltros(datos) {
    debugLog('FILTERS', 'Procesando respuesta de filtros...');
    
    try {
        // Actualizar gráfico de variedades (barras)
        if (datos.porVariedad) {
            const etiquetas = datos.porVariedad.map(item => item.nombreComun || 'Sin nombre');
            const cantidades = datos.porVariedad.map(item => item.cantidad || 0);
            
            // Mapeo de colores específicos por variedad
            const coloresPorVariedad = {
                'amarilla': DASHBOARD_CONFIG.colores.variedad.amarilla,
                'huayro': DASHBOARD_CONFIG.colores.variedad.huayro,
                'peruanita': DASHBOARD_CONFIG.colores.variedad.peruanita
            };
            
            const colores = datos.porVariedad.map(item => {
                const nombreComun = item.nombreComun || '';
                return coloresPorVariedad[nombreComun.toLowerCase()] || DASHBOARD_CONFIG.colores.ui.primary;
            });
            
            if (chartVariedadesBarras) {
                chartVariedadesBarras.data.labels = etiquetas;
                chartVariedadesBarras.data.datasets[0].data = cantidades;
                chartVariedadesBarras.data.datasets[0].backgroundColor = colores;
                chartVariedadesBarras.data.datasets[0].borderColor = colores;
                chartVariedadesBarras.update('none');
            }
        }
        
        // Actualizar gráfico de condiciones
        if (datos.estadisticas) {
            const aptos = datos.estadisticas.aptos || 0;
            const noAptos = datos.estadisticas.noAptos || 0;
            
            if (chartCondiciones) {
                chartCondiciones.data.datasets[0].data = [aptos, noAptos];
                chartCondiciones.update('none');
            }
        }
        
        // Actualizar gráfico de tendencia temporal
        if (datos.datosTemporales) {
            const fechas = datos.datosTemporales.map(d => {
                const fecha = new Date(d.fecha);
                return (fecha.getDate()) + '/' + (fecha.getMonth() + 1);
            });
            const cantidades = datos.datosTemporales.map(d => d.cantidad);
            
            if (chartTendencia) {
                chartTendencia.data.labels = fechas;
                chartTendencia.data.datasets[0].data = cantidades;
                chartTendencia.update('none');
            }
        }
        
        // Actualizar gráfico de distribución de confianza
        if (datos.distribucionConfianza) {
            const cantidades = [
                datos.distribucionConfianza.rango90_100 || 0,
                datos.distribucionConfianza.rango80_90 || 0,
                datos.distribucionConfianza.rango70_80 || 0,
                datos.distribucionConfianza.rango60_70 || 0,
                datos.distribucionConfianza.rangoMenor60 || 0
            ];
            
            if (chartConfianza) {
                chartConfianza.data.datasets[0].data = cantidades;
                chartConfianza.update('none');
            }
        }
        
        // Actualizar tarjetas de estadísticas
        actualizarTarjetasEstadisticas(datos.estadisticas);
        
        // Actualizar tabla si existe
        if (datos.clasificaciones) {
            actualizarTablaClasificaciones(datos.clasificaciones);
        }
        
        debugLog('FILTERS', '✅ Dashboard actualizado con datos filtrados');
    } catch (error) {
        debugLog('FILTERS', '❌ Error procesando respuesta:', error);
        throw error;
    }
}

// ========================================
// FUNCIÓN: ACTUALIZAR TARJETAS DE ESTADÍSTICAS
// ========================================
/**
 * Actualiza los valores de las tarjetas KPI
 * @param {Object} stats - Objeto con estadísticas
 */
function actualizarTarjetasEstadisticas(stats) {
    debugLog('FILTERS', 'Actualizando tarjetas de estadísticas...');
    
    // Actualizar total clasificaciones
    const totalElement = document.getElementById('stat-analisis');
    if (totalElement && stats.total !== undefined) {
        totalElement.textContent = formatoNumero(stats.total);
    }
    
    // Actualizar confianza promedio
    const confianzaElement = document.getElementById('stat-precision');
    if (confianzaElement && stats.confianzaPromedio !== undefined) {
        const porcentaje = Math.round(stats.confianzaPromedio * 100);
        confianzaElement.textContent = porcentaje + '%';
    }
    
    // Actualizar papas aptas
    const aptosElement = document.querySelector('[data-stat="aptos"]');
    if (aptosElement && stats.aptos !== undefined) {
        aptosElement.textContent = formatoNumero(stats.aptos);
    }
    
    // Actualizar papas no aptas
    const noAptosElement = document.querySelector('[data-stat="no-aptos"]');
    if (noAptosElement && stats.noAptos !== undefined) {
        noAptosElement.textContent = formatoNumero(stats.noAptos);
    }
    
    debugLog('FILTERS', '✅ Tarjetas actualizadas');
}

// ========================================
// FUNCIÓN: ACTUALIZAR TABLA DE CLASIFICACIONES
// ========================================
/**
 * Actualiza la tabla de clasificaciones con nuevos datos
 * @param {Array} clasificaciones - Array de clasificaciones
 */
function actualizarTablaClasificaciones(clasificaciones) {
    debugLog('FILTERS', 'Actualizando tabla de clasificaciones...', 
        clasificaciones.length + ' registros');
    
    // Si existe DataTables, actualizar la tabla
    if (window.$ && $.fn.dataTable) {
        const tabla = $('#tablaClasificaciones');
        if (tabla.length && tabla.DataTable) {
            try {
                const dt = tabla.DataTable();
                
                // Limpiar tabla
                dt.clear();
                
                // Agregar nuevos datos
                clasificaciones.forEach(item => {
                    const fila = [
                        item.idClasificacion || '',
                        formatoFechaISO(item.fechaClasificacion) || '',
                        item.idVariedad?.nombreComun || '',
                        item.condicion?.toUpperCase() || '',
                        formatoPorcentaje(item.confianza) || '',
                        item.idUsuario?.nombre || '',
                        item.estado || ''
                    ];
                    dt.row.add(fila);
                });
                
                dt.draw();
                debugLog('FILTERS', '✅ Tabla actualizada con DataTables');
            } catch (error) {
                debugLog('FILTERS', '⚠️ Error al actualizar tabla DataTables:', error);
            }
        }
    }
}

// ========================================
// FUNCIÓN: LIMPIAR FILTROS
// ========================================
/**
 * Limpia todos los filtros y recarga los datos originales
 */
async function limpiarFiltros() {
    debugLog('FILTERS', 'Limpiando filtros...');
    
    try {
        // Resetear inputs de filtros (usando los IDs correctos)
        document.getElementById('fecha-inicio').value = '';
        document.getElementById('fecha-fin').value = '';
        document.getElementById('variedad').value = '';
        document.getElementById('condicion').value = '';
        
        // Limpiar filtros actuales
        filtroActual = {
            fechaInicio: '',
            fechaFin: '',
            variedad: '',
            condicion: ''
        };
        
        // Recargar página para obtener datos originales
        debugLog('FILTERS', 'Filtros limpiados, recargando página...');
        location.reload();
        
    } catch (error) {
        debugLog('FILTERS', '❌ Error al limpiar filtros:', error);
        mostrarAlerta('danger', 'Error al limpiar filtros');
    }
}

// ========================================
// FUNCIÓN: OBTENER FILTROS ACTUALES
// ========================================
/**
 * Devuelve el objeto de filtros actuales
 * @returns {Object} Objeto con los filtros actuales
 */
function obtenerFiltrosActuales() {
    return { ...filtroActual };
}

// ========================================
// FUNCIÓN: ESTABLECER FILTROS
// ========================================
/**
 * Establece los valores de filtros
 * @param {Object} filtros - Objeto con filtros a establecer
 */
function establecerFiltros(filtros) {
    if (filtros.fechaInicio) {
        const input = document.getElementById('filtroFechaInicio');
        if (input) input.value = formatoFechaISO(filtros.fechaInicio);
    }
    
    if (filtros.fechaFin) {
        const input = document.getElementById('filtroFechaFin');
        if (input) input.value = formatoFechaISO(filtros.fechaFin);
    }
    
    if (filtros.variedad) {
        const input = document.getElementById('filtroVariedad');
        if (input) input.value = filtros.variedad;
    }
    
    if (filtros.condicion) {
        const input = document.getElementById('filtroCondicion');
        if (input) input.value = filtros.condicion;
    }
    
    debugLog('FILTERS', 'Filtros establecidos:', filtros);
}

debugLog('FILTERS', '✅ Script de filtros cargado');
