// Reportes Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeReportes();
});

// Initialize reportes page
function initializeReportes() {
    setupDataTables();
    setupFilters();
    setupExportButtons();
    setupDatePickers();
    setupStatsCards();
}

// Setup DataTables
function setupDataTables() {
    const tablas = document.querySelectorAll('.tabla-reportes');
    
    tablas.forEach(tabla => {
        if (tabla.id === 'tablaClasificaciones') {
            setupClasificacionesTable(tabla);
        } else if (tabla.id === 'tablaUsuarios') {
            setupUsuariosTable(tabla);
        } else if (tabla.id === 'tablaTrazabilidad') {
            setupTrazabilidadTable(tabla);
        }
    });
}

// Setup clasificaciones table
function setupClasificacionesTable(tabla) {
    const dataTable = $(tabla).DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        responsive: true,
        pageLength: 25,
        order: [[0, 'desc']],
        columnDefs: [
            {
                targets: [4], // Confianza column
                render: function(data, type, row) {
                    if (type === 'display') {
                        const percentage = parseFloat(data);
                        let colorClass = 'bg-success';
                        if (percentage < 80) colorClass = 'bg-warning';
                        if (percentage < 50) colorClass = 'bg-danger';
                        
                        return `
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar ${colorClass}" 
                                     role="progressbar" 
                                     style="width: ${percentage}%"
                                     aria-valuenow="${percentage}"
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                    ${percentage}%
                                </div>
                            </div>
                        `;
                    }
                    return data;
                }
            },
            {
                targets: [5], // Estado column
                render: function(data, type, row) {
                    if (type === 'display') {
                        const badgeClass = data === 'Completado' ? 'bg-success' : 
                                         data === 'Procesando' ? 'bg-warning' : 'bg-danger';
                        return `<span class="badge ${badgeClass}">${data}</span>`;
                    }
                    return data;
                }
            },
            {
                targets: [6], // Acciones column
                orderable: false,
                render: function(data, type, row) {
                    if (type === 'display') {
                        return `
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" 
                                        class="btn btn-outline-info btn-sm" 
                                        onclick="verDetalle('${row[0]}')"
                                        title="Ver detalle">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button type="button" 
                                        class="btn btn-outline-warning btn-sm" 
                                        onclick="exportarClasificacion('${row[0]}')"
                                        title="Exportar">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        `;
                    }
                    return '';
                }
            }
        ],
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel me-1"></i> Excel',
                className: 'btn btn-success btn-sm'
            },
            {
                extend: 'pdf',
                text: '<i class="fas fa-file-pdf me-1"></i> PDF',
                className: 'btn btn-danger btn-sm'
            },
            {
                extend: 'print',
                text: '<i class="fas fa-print me-1"></i> Imprimir',
                className: 'btn btn-info btn-sm'
            }
        ],
        initComplete: function() {
            // Add custom search fields
            this.api().columns().every(function() {
                const column = this;
                const header = $(column.header());
                
                if (header.hasClass('searchable')) {
                    const input = $('<input type="text" class="form-control form-control-sm" placeholder="Buscar...">')
                        .appendTo($(column.footer()).empty())
                        .on('keyup change clear', function() {
                            if (column.search() !== this.value) {
                                column.search(this.value).draw();
                            }
                        });
                }
            });
        }
    });
    
    return dataTable;
}

// Setup usuarios table
function setupUsuariosTable(tabla) {
    return $(tabla).DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        responsive: true,
        pageLength: 15,
        order: [[3, 'desc']], // Último acceso
        columnDefs: [
            {
                targets: [4], // Estado column
                render: function(data, type, row) {
                    if (type === 'display') {
                        const badgeClass = data === 'Activo' ? 'bg-success' : 'bg-secondary';
                        return `<span class="badge ${badgeClass}">${data}</span>`;
                    }
                    return data;
                }
            },
            {
                targets: [5], // Acciones column
                orderable: false,
                render: function(data, type, row) {
                    if (type === 'display') {
                        return `
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" 
                                        class="btn btn-outline-info btn-sm" 
                                        onclick="verPerfilUsuario('${row[0]}')"
                                        title="Ver perfil">
                                    <i class="fas fa-user"></i>
                                </button>
                                <button type="button" 
                                        class="btn btn-outline-primary btn-sm" 
                                        onclick="editarUsuario('${row[0]}')"
                                        title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        `;
                    }
                    return '';
                }
            }
        ]
    });
}

// Setup trazabilidad table
function setupTrazabilidadTable(tabla) {
    return $(tabla).DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        responsive: true,
        pageLength: 20,
        order: [[0, 'desc']], // Fecha
        columnDefs: [
            {
                targets: [2], // Acción column
                render: function(data, type, row) {
                    if (type === 'display') {
                        let badgeClass = 'bg-secondary';
                        if (data.includes('login')) badgeClass = 'bg-success';
                        if (data.includes('logout')) badgeClass = 'bg-warning';
                        if (data.includes('error')) badgeClass = 'bg-danger';
                        if (data.includes('clasificar')) badgeClass = 'bg-info';
                        
                        return `<span class="badge ${badgeClass}">${data}</span>`;
                    }
                    return data;
                }
            }
        ]
    });
}

// Setup filters
function setupFilters() {
    // Date range filter
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    const filtroVariedad = document.getElementById('filtroVariedad');
    const filtroEstado = document.getElementById('filtroEstado');
    
    if (fechaInicio && fechaFin) {
        [fechaInicio, fechaFin].forEach(input => {
            input.addEventListener('change', aplicarFiltros);
        });
    }
    
    if (filtroVariedad) {
        filtroVariedad.addEventListener('change', aplicarFiltros);
    }
    
    if (filtroEstado) {
        filtroEstado.addEventListener('change', aplicarFiltros);
    }
    
    // Reset filters button
    const resetBtn = document.getElementById('resetFiltros');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetearFiltros);
    }
}

// Apply filters
function aplicarFiltros() {
    const tabla = $('#tablaClasificaciones').DataTable();
    
    const fechaInicio = document.getElementById('fechaInicio')?.value;
    const fechaFin = document.getElementById('fechaFin')?.value;
    const variedad = document.getElementById('filtroVariedad')?.value;
    const estado = document.getElementById('filtroEstado')?.value;
    
    // Clear existing filters
    tabla.columns().search('').draw();
    
    // Apply date filter
    if (fechaInicio || fechaFin) {
        $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
            const fecha = new Date(data[0]); // Assuming first column is date
            const inicio = fechaInicio ? new Date(fechaInicio) : new Date('1900-01-01');
            const fin = fechaFin ? new Date(fechaFin) : new Date('2099-12-31');
            
            return fecha >= inicio && fecha <= fin;
        });
    }
    
    // Apply variety filter
    if (variedad && variedad !== '') {
        tabla.column(2).search(variedad);
    }
    
    // Apply status filter
    if (estado && estado !== '') {
        tabla.column(5).search(estado);
    }
    
    tabla.draw();
    
    // Update statistics
    actualizarEstadisticas();
}

// Reset filters
function resetearFiltros() {
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
    document.getElementById('filtroVariedad').value = '';
    document.getElementById('filtroEstado').value = '';
    
    // Clear DataTable filters
    const tabla = $('#tablaClasificaciones').DataTable();
    $.fn.dataTable.ext.search = [];
    tabla.columns().search('').draw();
    
    // Reset statistics
    actualizarEstadisticas();
}

// Setup export buttons
function setupExportButtons() {
    const exportExcelBtn = document.getElementById('exportarExcel');
    const exportPdfBtn = document.getElementById('exportarPdf');
    const exportCsvBtn = document.getElementById('exportarCsv');
    
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => exportarDatos('excel'));
    }
    
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => exportarDatos('pdf'));
    }
    
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportarDatos('csv'));
    }
}

// Export data
async function exportarDatos(formato) {
    const loading = mostrarCarga('Preparando exportación...');
    
    try {
        const response = await fetch(`/reportes/exportar/${formato}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(getFiltrosActivos())
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `reporte_clasificaciones_${new Date().toISOString().split('T')[0]}.${formato}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            mostrarToast('Archivo descargado exitosamente', 'success');
        } else {
            throw new Error('Error en la descarga');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al exportar datos', 'error');
    } finally {
        ocultarCarga(loading);
    }
}

// Get active filters
function getFiltrosActivos() {
    return {
        fechaInicio: document.getElementById('fechaInicio')?.value || null,
        fechaFin: document.getElementById('fechaFin')?.value || null,
        variedad: document.getElementById('filtroVariedad')?.value || null,
        estado: document.getElementById('filtroEstado')?.value || null
    };
}

// Setup date pickers
function setupDatePickers() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    
    dateInputs.forEach(input => {
        // Set max date to today
        input.max = new Date().toISOString().split('T')[0];
        
        // Set default date range (last 30 days)
        if (input.id === 'fechaInicio') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            input.value = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (input.id === 'fechaFin') {
            input.value = new Date().toISOString().split('T')[0];
        }
    });
}

// Setup stats cards
function setupStatsCards() {
    cargarEstadisticas();
    
    // Auto-refresh statistics every 5 minutes
    setInterval(cargarEstadisticas, 5 * 60 * 1000);
}

// Load statistics
async function cargarEstadisticas() {
    try {
        const response = await fetch('/reportes/estadisticas');
        const stats = await response.json();
        
        if (response.ok) {
            actualizarTarjetasEstadisticas(stats);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Update statistics cards
function actualizarTarjetasEstadisticas(stats) {
    // Total classifications
    const totalElement = document.getElementById('totalClasificaciones');
    if (totalElement) {
        animateNumber(totalElement, stats.totalClasificaciones || 0);
    }
    
    // Today's classifications
    const hoyElement = document.getElementById('clasificacionesHoy');
    if (hoyElement) {
        animateNumber(hoyElement, stats.clasificacionesHoy || 0);
    }
    
    // Average confidence
    const confianzaElement = document.getElementById('confianzaPromedio');
    if (confianzaElement) {
        animateNumber(confianzaElement, stats.confianzaPromedio || 0, '%');
    }
    
    // Active users
    const usuariosElement = document.getElementById('usuariosActivos');
    if (usuariosElement) {
        animateNumber(usuariosElement, stats.usuariosActivos || 0);
    }
    
    // Update variety distribution chart
    if (stats.distribucionVariedades) {
        actualizarGraficoVariedades(stats.distribucionVariedades);
    }
}

// Animate number
function animateNumber(element, targetValue, suffix = '') {
    const startValue = parseInt(element.textContent) || 0;
    const difference = targetValue - startValue;
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    function updateNumber() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.round(startValue + (difference * progress));
        
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Update variety distribution chart
function actualizarGraficoVariedades(distribucion) {
    // This would integrate with Chart.js or similar library
    console.log('Updating variety distribution:', distribucion);
}

// Update statistics after filters
function actualizarEstadisticas() {
    // Get filtered data count
    const tabla = $('#tablaClasificaciones').DataTable();
    const filteredCount = tabla.rows({ filter: 'applied' }).count();
    
    // Update filtered count display
    const filteredElement = document.getElementById('resultadosFiltrados');
    if (filteredElement) {
        filteredElement.textContent = filteredCount;
    }
}

// Show loading
function mostrarCarga(mensaje = 'Cargando...') {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-content">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">${mensaje}</span>
            </div>
            <p class="mt-2">${mensaje}</p>
        </div>
    `;
    document.body.appendChild(loading);
    return loading;
}

// Hide loading
function ocultarCarga(loading) {
    if (loading && loading.parentNode) {
        loading.parentNode.removeChild(loading);
    }
}

// Show toast notification
function mostrarToast(mensaje, tipo = 'info') {
    const toastContainer = document.getElementById('toastContainer') || crearToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo === 'success' ? 'success' : tipo === 'error' ? 'danger' : 'info'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                ${mensaje}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Create toast container
function crearToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '11';
    document.body.appendChild(container);
    return container;
}

// Detail view functions
function verDetalle(clasificacionId) {
    // Implement detail view modal or navigation
    console.log('Ver detalle:', clasificacionId);
}

function exportarClasificacion(clasificacionId) {
    // Implement individual classification export
    console.log('Exportar clasificación:', clasificacionId);
}

function verPerfilUsuario(usuarioId) {
    // Implement user profile view
    console.log('Ver perfil usuario:', usuarioId);
}

function editarUsuario(usuarioId) {
    // Implement user edit functionality
    console.log('Editar usuario:', usuarioId);
}

// Export functions for global access
window.verDetalle = verDetalle;
window.exportarClasificacion = exportarClasificacion;
window.verPerfilUsuario = verPerfilUsuario;
window.editarUsuario = editarUsuario;
window.aplicarFiltros = aplicarFiltros;
window.resetearFiltros = resetearFiltros;