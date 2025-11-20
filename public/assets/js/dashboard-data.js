/**
 * ========================================
 * DASHBOARD - DATOS Y ANIMACIONES
 * ========================================
 * 
 * Archivo: dashboard-data.js
 * Propósito: Animaciones, actualizaciones en tiempo real, helpers de datos
 * Dependencias: dashboard-config.js
 * 
 * Funciones:
 * 1. Animar valores KPI
 * 2. Actualizar timestamps
 * 3. Manejar datos en tiempo real
 * 4. Limpiar memoria
 * ========================================
 */

// ========== VARIABLES GLOBALES DE TIEMPO REAL ==========
let intervaloDatos = null;
let tiempoUltimaActualizacion = null;

// ========================================
// FUNCIÓN: ANIMAR VALORES DE ESTADÍSTICAS
// ========================================
/**
 * Anima los números de las tarjetas KPI con efecto contador
 * Se ejecuta cuando carga la página
 */
function animarValoresEstadisticas() {
    debugLog('DATA', 'Animando valores de estadísticas...');
    
    const statValues = document.querySelectorAll('.stat-value');
    
    if (statValues.length === 0) {
        debugLog('DATA', '⚠️ No hay elementos .stat-value para animar');
        return;
    }
    
    statValues.forEach((stat, index) => {
        const valorFinal = stat.textContent.trim();
        const textoOriginal = stat.textContent;
        
        // Resetear el valor
        stat.textContent = '0';
        
        // Iniciar animación después de un delay
        setTimeout(() => {
            const esProcentaje = valorFinal.includes('%');
            const esTiempo = valorFinal.includes('s');
            const valoresNumericos = valorFinal.match(/[\d.,]+/g);
            
            if (!valoresNumericos || valoresNumericos.length === 0) {
                stat.textContent = textoOriginal;
                return;
            }
            
            let numeroFinal = parseFloat(valoresNumericos[0].replace(/[.,]/g, 
                valoresNumericos[0].lastIndexOf('.') > 0 ? '' : '.'));
            
            let numeroActual = 0;
            const incremento = numeroFinal / 50; // 50 pasos de animación
            const duracionPorPaso = DASHBOARD_CONFIG.animacion.duracion / 50;
            
            const contador = setInterval(() => {
                numeroActual += incremento;
                
                if (numeroActual >= numeroFinal) {
                    numeroActual = numeroFinal;
                    clearInterval(contador);
                }
                
                let valorMostrar = Math.floor(numeroActual);
                
                if (esProcentaje) {
                    valorMostrar = numeroActual.toFixed(1) + '%';
                } else if (esTiempo) {
                    valorMostrar = numeroActual.toFixed(1) + 's';
                } else if (numeroFinal > 1000) {
                    valorMostrar = Math.floor(numeroActual).toLocaleString('es-PE');
                }
                
                stat.textContent = valorMostrar;
            }, duracionPorPaso);
            
        }, index * 150); // Delay entre cada estadística
    });
    
    debugLog('DATA', '✅ Animación de valores iniciada');
}

// ========================================
// FUNCIÓN: ANIMAR BARRAS DE PROGRESO
// ========================================
/**
 * Anima las barras de progreso con efecto de crecimiento
 */
function animarBarrasProgreso() {
    debugLog('DATA', 'Animando barras de progreso...');
    
    const barras = document.querySelectorAll('.progress-bar-eco');
    
    barras.forEach(barra => {
        const ancho = barra.style.width || '0%';
        barra.style.width = '0%';
        barra.style.transition = 'width 0.8s ease-out';
        
        setTimeout(() => {
            barra.style.width = ancho;
        }, 100);
    });
    
    debugLog('DATA', `✅ ${barras.length} barras de progreso animadas`);
}

// ========================================
// FUNCIÓN: ACTUALIZAR TIMESTAMPS RELATIVOS
// ========================================
/**
 * Actualiza los timestamps relativos (ej: "Hace 2 horas")
 * Se ejecuta periódicamente para mantener timestamps al día
 */
function actualizarTimestampsRelativos() {
    debugLog('DATA', 'Actualizando timestamps relativos...');
    
    const elementos = document.querySelectorAll('[data-timestamp]');
    
    elementos.forEach(elemento => {
        const timestamp = elemento.getAttribute('data-timestamp');
        if (!timestamp) return;
        
        const fecha = new Date(timestamp);
        const ahora = new Date();
        const diferencia = Math.floor((ahora - fecha) / 1000); // segundos
        
        let texto = '';
        
        if (diferencia < 60) {
            texto = 'Hace unos segundos';
        } else if (diferencia < 3600) {
            const minutos = Math.floor(diferencia / 60);
            texto = `Hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
        } else if (diferencia < 86400) {
            const horas = Math.floor(diferencia / 3600);
            texto = `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
        } else {
            const dias = Math.floor(diferencia / 86400);
            texto = `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
        }
        
        elemento.textContent = texto;
    });
    
    debugLog('DATA', `✅ ${elementos.length} timestamps actualizados`);
}

// ========================================
// FUNCIÓN: CARGAR DATOS EN TIEMPO REAL
// ========================================
/**
 * Carga datos actualizados del servidor periódicamente
 */
async function cargarDatosEnTiempoReal() {
    debugLog('DATA', 'Cargando datos en tiempo real...');
    
    try {
        // Actualizar timestamps
        actualizarTimestampsRelativos();
        
        // Aquí puedes agregar llamadas AJAX adicionales si es necesario
        // Ejemplo: fetch('/api/dashboard/datos-actuales')
        
        tiempoUltimaActualizacion = new Date();
        
    } catch (error) {
        debugLog('DATA', '⚠️ Error al cargar datos en tiempo real:', error);
    }
}

// ========================================
// FUNCIÓN: INICIAR ACTUALIZACIONES PERIÓDICAS
// ========================================
/**
 * Inicia el intervalo de actualización de datos
 * @param {number} intervalo - Milisegundos entre actualizaciones (default: 30000)
 */
function iniciarActualizacionesPeriodicas(intervalo = 30000) {
    debugLog('DATA', `Iniciando actualizaciones periódicas cada ${intervalo}ms...`);
    
    // Cargar datos inmediatamente
    cargarDatosEnTiempoReal();
    
    // Luego hacerlo periódicamente
    if (intervaloDatos) {
        clearInterval(intervaloDatos);
    }
    
    intervaloDatos = setInterval(() => {
        cargarDatosEnTiempoReal();
    }, intervalo);
    
    debugLog('DATA', '✅ Actualizaciones periódicas iniciadas');
}

// ========================================
// FUNCIÓN: DETENER ACTUALIZACIONES PERIÓDICAS
// ========================================
/**
 * Detiene el intervalo de actualización de datos
 */
function detenerActualizacionesPeriodicas() {
    if (intervaloDatos) {
        clearInterval(intervaloDatos);
        intervaloDatos = null;
        debugLog('DATA', '✅ Actualizaciones periódicas detenidas');
    }
}

// ========================================
// FUNCIÓN: EFECTOS HOVER EN BOTONES DE ACCIÓN
// ========================================
/**
 * Añade efectos hover a los botones de acción rápida
 */
function agregarEfectosHover() {
    debugLog('DATA', 'Agregando efectos hover...');
    
    const botonesAccion = document.querySelectorAll('.action-btn');
    
    botonesAccion.forEach(boton => {
        boton.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        boton.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    debugLog('DATA', `✅ Efectos hover en ${botonesAccion.length} botones`);
}

// ========================================
// FUNCIÓN: SMOOTH SCROLLING
// ========================================
/**
 * Activa el scroll suave para enlaces internos
 */
function activarSmoothScroll() {
    debugLog('DATA', 'Activando smooth scrolling...');
    
    document.querySelectorAll('a[href^="#"]').forEach(enlace => {
        enlace.addEventListener('click', function(evento) {
            evento.preventDefault();
            
            const idDestino = this.getAttribute('href');
            const elemento = document.querySelector(idDestino);
            
            if (elemento) {
                elemento.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    debugLog('DATA', '✅ Smooth scrolling activado');
}

// ========================================
// FUNCIÓN: INICIALIZAR TOOLTIPS
// ========================================
/**
 * Inicializa los tooltips de Bootstrap
 */
function inicializarTooltips() {
    debugLog('DATA', 'Inicializando tooltips...');
    
    try {
        if (typeof bootstrap !== 'undefined') {
            const elementos = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            
            elementos.forEach(elemento => {
                new bootstrap.Tooltip(elemento);
            });
            
            debugLog('DATA', `✅ ${elementos.length} tooltips inicializados`);
        }
    } catch (error) {
        debugLog('DATA', '⚠️ Error al inicializar tooltips:', error);
    }
}

// ========================================
// FUNCIÓN: CONFIGURAR SIDEBAR MÓVIL
// ========================================
/**
 * Configura el menú hamburguesa para dispositivos móviles
 */
function configurarSidebarMovil() {
    if (window.innerWidth >= 992) {
        return; // Solo en móvil
    }
    
    debugLog('DATA', 'Configurando sidebar móvil...');
    
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    let menuAbierto = false;
    
    const botonToggle = document.createElement('button');
    botonToggle.className = 'btn btn-success position-fixed';
    botonToggle.style.cssText = `
        top: 20px; 
        left: 20px; 
        z-index: 1099;
        padding: 0.5rem 0.75rem;
    `;
    botonToggle.innerHTML = '<i class="fas fa-bars"></i>';
    botonToggle.setAttribute('aria-label', 'Menú');
    
    botonToggle.addEventListener('click', () => {
        menuAbierto = !menuAbierto;
        sidebar.style.marginLeft = menuAbierto ? '0' : '-250px';
        botonToggle.innerHTML = menuAbierto ? 
            '<i class="fas fa-times"></i>' : 
            '<i class="fas fa-bars"></i>';
    });
    
    // Cerrar menú al hacer click fuera
    document.addEventListener('click', (evento) => {
        if (!sidebar.contains(evento.target) && 
            !botonToggle.contains(evento.target) && 
            menuAbierto) {
            menuAbierto = false;
            sidebar.style.marginLeft = '-250px';
            botonToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
    
    document.body.appendChild(botonToggle);
    
    debugLog('DATA', '✅ Sidebar móvil configurado');
}

// ========================================
// FUNCIÓN: LIMPIAR MEMORIA
// ========================================
/**
 * Limpia recursos cuando se abandona la página
 */
function limpiarMemoria() {
    debugLog('DATA', 'Limpiando memoria...');
    
    // Detener actualizaciones periódicas
    detenerActualizacionesPeriodicas();
    
    // Destruir gráficos
    if (typeof destruirGraficos === 'function') {
        destruirGraficos();
    }
    
    debugLog('DATA', '✅ Memoria limpiada');
}

// ========================================
// ESCUCHADOR: LIMPIAR AL ABANDONAR PÁGINA
// ========================================
window.addEventListener('beforeunload', limpiarMemoria);

debugLog('DATA', '✅ Script de datos y animaciones cargado');
