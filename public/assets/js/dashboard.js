// Dashboard Common JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Initialize dashboard functionality
function initializeDashboard() {
    setupNavigation();
    setupUserMenu();
    setupNotifications();
    setupTooltips();
    setupAutoLogout();
    loadDashboardStats();
    setupRealTimeUpdates();
    setupAnimations();
    setupKeyboardShortcuts();
    loadDashboardData();
}

// Setup navigation
function setupNavigation() {
    // Highlight active navigation item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href) && href !== '/') {
            link.classList.add('active');
            link.closest('.nav-item')?.classList.add('active');
        }
    });
    
    // Setup mobile menu toggle
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        navbarToggler.addEventListener('click', () => {
            navbarCollapse.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!navbarToggler.contains(event.target) && 
                !navbarCollapse.contains(event.target) && 
                navbarCollapse.classList.contains('show')) {
                navbarCollapse.classList.remove('show');
            }
        });
    }
}

// Setup user menu
function setupUserMenu() {
    const userDropdown = document.getElementById('userDropdown');
    
    if (userDropdown) {
        // Load user info
        loadUserInfo();
        
        // Setup logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }
}

// Load user information
async function loadUserInfo() {
    try {
        const response = await fetch('/auth/usuario-info');
        const userInfo = await response.json();
        
        if (response.ok) {
            updateUserDisplay(userInfo);
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Update user display
function updateUserDisplay(userInfo) {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userRoleElement = document.getElementById('userRole');
    
    if (userNameElement) userNameElement.textContent = userInfo.nombre || 'Usuario';
    if (userEmailElement) userEmailElement.textContent = userInfo.email || '';
    if (userRoleElement) userRoleElement.textContent = userInfo.rol || 'Usuario';
}

// Handle logout
async function handleLogout(event) {
    event.preventDefault();
    
    const confirmed = await showConfirmModal(
        'Cerrar Sesión',
        '¿Estás seguro que deseas cerrar sesión?',
        'warning'
    );
    
    if (confirmed) {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                window.location.href = '/auth/login';
            } else {
                showToast('Error al cerrar sesión', 'error');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            showToast('Error de conexión', 'error');
        }
    }
}

// Setup notifications
function setupNotifications() {
    // Check for new notifications periodically
    setInterval(checkNotifications, 30000); // Every 30 seconds
    
    // Load initial notifications
    loadNotifications();
}

// Load notifications
async function loadNotifications() {
    try {
        const response = await fetch('/auth/notificaciones');
        const notifications = await response.json();
        
        if (response.ok) {
            updateNotificationBadge(notifications.length);
            updateNotificationList(notifications);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Check for new notifications
async function checkNotifications() {
    try {
        const response = await fetch('/auth/notificaciones/nuevas');
        const data = await response.json();
        
        if (response.ok && data.nuevas > 0) {
            updateNotificationBadge(data.total);
            
            // Show toast for new notifications
            if (data.nuevas === 1) {
                showToast('Tienes una nueva notificación', 'info');
            } else {
                showToast(`Tienes ${data.nuevas} nuevas notificaciones`, 'info');
            }
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// Update notification badge
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Update notification list
function updateNotificationList(notifications) {
    const container = document.getElementById('notificationList');
    
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center p-3 text-muted">
                <i class="fas fa-bell-slash fa-2x mb-2"></i>
                <p>No tienes notificaciones</p>
            </div>
        `;
        return;
    }
    
    const html = notifications.map(notif => `
        <div class="notification-item ${notif.leida ? '' : 'unread'}" 
             data-id="${notif.id}">
            <div class="d-flex">
                <div class="notification-icon me-3">
                    <i class="fas fa-${getNotificationIcon(notif.tipo)} text-${getNotificationColor(notif.tipo)}"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="notification-title mb-1">${notif.titulo}</h6>
                    <p class="notification-message mb-1 text-muted">${notif.mensaje}</p>
                    <small class="text-muted">${formatearFecha(notif.fecha)}</small>
                </div>
                ${notif.leida ? '' : '<div class="notification-badge"></div>'}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Add click handlers to mark as read
    container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            marcarComoLeida(item.dataset.id);
            item.classList.remove('unread');
            item.querySelector('.notification-badge')?.remove();
        });
    });
}

// Get notification icon
function getNotificationIcon(tipo) {
    const icons = {
        'info': 'info-circle',
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'times-circle',
        'clasificacion': 'brain',
        'sistema': 'cog'
    };
    return icons[tipo] || 'bell';
}

// Get notification color
function getNotificationColor(tipo) {
    const colors = {
        'info': 'info',
        'success': 'success',
        'warning': 'warning',
        'error': 'danger',
        'clasificacion': 'primary',
        'sistema': 'secondary'
    };
    return colors[tipo] || 'primary';
}

// Mark notification as read
async function marcarComoLeida(notificationId) {
    try {
        await fetch(`/auth/notificaciones/${notificationId}/leer`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Setup tooltips
function setupTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Setup auto logout
function setupAutoLogout() {
    let idleTime = 0;
    const maxIdleTime = 30; // 30 minutes
    
    // Increment idle time
    const idleInterval = setInterval(() => {
        idleTime++;
        
        if (idleTime >= maxIdleTime) {
            showAutoLogoutWarning();
            clearInterval(idleInterval);
        }
    }, 60000); // Check every minute
    
    // Reset idle time on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
            idleTime = 0;
        }, true);
    });
}

// Show auto logout warning
function showAutoLogoutWarning() {
    showConfirmModal(
        'Sesión por Expirar',
        'Tu sesión expirará en breve por inactividad. ¿Deseas continuar?',
        'warning',
        'Continuar Sesión',
        'Cerrar Sesión'
    ).then(continuar => {
        if (continuar) {
            // Reset idle time and continue
            setupAutoLogout();
        } else {
            // Force logout
            window.location.href = '/auth/login';
        }
    });
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/reportes/dashboard-stats');
        const stats = await response.json();
        
        if (response.ok) {
            updateDashboardStats(stats);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    // Update quick stats cards
    const elementos = {
        'clasificaciones-hoy': stats.clasificacionesHoy || 0,
        'total-clasificaciones': stats.totalClasificaciones || 0,
        'precision-promedio': (stats.precisionPromedio || 0) + '%',
        'tiempo-respuesta': (stats.tiempoRespuesta || 0) + 'ms'
    };
    
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            animateStatCounter(elemento, valor);
        }
    });
    
    // Update recent activity
    if (stats.actividadReciente) {
        updateRecentActivity(stats.actividadReciente);
    }
}

// Animate statistic counter
function animateStatCounter(element, targetValue) {
    const isPercentage = typeof targetValue === 'string' && targetValue.includes('%');
    const isTime = typeof targetValue === 'string' && targetValue.includes('ms');
    const numericValue = parseInt(targetValue) || 0;
    
    let currentValue = 0;
    const increment = Math.ceil(numericValue / 50); // 50 steps
    const duration = 1000; // 1 second
    const stepTime = duration / 50;
    
    const timer = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= numericValue) {
            currentValue = numericValue;
            clearInterval(timer);
        }
        
        let displayValue = currentValue.toString();
        if (isPercentage) displayValue += '%';
        if (isTime) displayValue += 'ms';
        
        element.textContent = displayValue;
    }, stepTime);
}

// Update recent activity
function updateRecentActivity(activities) {
    const container = document.getElementById('actividadReciente');
    
    if (!container || !activities.length) return;
    
    const html = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(activity.tipo)}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-description mb-1">${activity.descripcion}</p>
                <small class="text-muted">${formatearFecha(activity.fecha)}</small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Get activity icon
function getActivityIcon(tipo) {
    const icons = {
        'clasificacion': 'brain',
        'login': 'sign-in-alt',
        'logout': 'sign-out-alt',
        'error': 'exclamation-triangle',
        'export': 'download'
    };
    return icons[tipo] || 'circle';
}

// Setup real-time updates
function setupRealTimeUpdates() {
    // Update statistics every 30 seconds
    setInterval(() => {
        updateStatistics();
    }, 30000);
    
    // Update recent activity every 60 seconds
    setInterval(() => {
        updateRecentActivity();
    }, 60000);
}

// Setup animations
function setupAnimations() {
    // Animate statistics cards on load
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Add hover effects to interactive elements
    const interactiveElements = document.querySelectorAll('.btn, .card-body');
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Alt + C = Clasificar
        if (e.altKey && e.key === 'c') {
            e.preventDefault();
            window.location.href = '/clasificacion';
        }
        
        // Alt + R = Reportes
        if (e.altKey && e.key === 'r') {
            e.preventDefault();
            window.location.href = '/reportes';
        }
        
        // Alt + D = Dashboard
        if (e.altKey && e.key === 'd') {
            e.preventDefault();
            window.location.href = '/dashboard';
        }
        
        // F5 = Refresh
        if (e.key === 'F5') {
            e.preventDefault();
            location.reload();
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStatistics(),
            loadRecentActivity(),
            loadModelStatus()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('Error cargando datos del dashboard');
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/reportes/api/estadisticas');
        
        if (!response.ok) {
            throw new Error('Error loading statistics');
        }
        
        const data = await response.json();
        updateStatisticsDisplay(data);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        showStatisticsError();
    }
}

// Update statistics display
function updateStatisticsDisplay(data) {
    const container = document.getElementById('estadisticas-container');
    
    if (!container) return;
    
    const html = `
        <div class="col-md-3 mb-3">
            <div class="card bg-primary text-white h-100">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <p class="card-text opacity-75 mb-1">Total Clasificaciones</p>
                            <h3 class="mb-0">${data.general.totalClasificaciones || 0}</h3>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-images fa-2x opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card bg-success text-white h-100">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <p class="card-text opacity-75 mb-1">Confianza Promedio</p>
                            <h3 class="mb-0">${Math.round((data.general.confianzaPromedio || 0) * 100)}%</h3>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-brain fa-2x opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card bg-info text-white h-100">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <p class="card-text opacity-75 mb-1">Alta Confianza</p>
                            <h3 class="mb-0">${data.distribucionConfianza.alta || 0}</h3>
                            <small class="opacity-75">≥ 80%</small>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-star fa-2x opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card bg-warning text-white h-100">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <p class="card-text opacity-75 mb-1">Variedades</p>
                            <h3 class="mb-0">${data.porVariedad.length || 0}</h3>
                            <small class="opacity-75">Detectadas</small>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-seedling fa-2x opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch('/clasificacion/historial?limit=5');
        
        if (!response.ok) {
            throw new Error('Error loading recent activity');
        }
        
        const data = await response.json();
        updateRecentActivityDisplay(data.clasificaciones || []);
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        showActivityError();
    }
}

// Update recent activity display
function updateRecentActivityDisplay(clasificaciones) {
    const container = document.getElementById('actividad-reciente');
    
    if (!container) return;
    
    if (clasificaciones.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-inbox fa-3x opacity-25 mb-3"></i>
                <p>No hay actividad reciente</p>
                <a href="/clasificacion" class="btn btn-success">
                    <i class="fas fa-plus me-1"></i>
                    Crear primera clasificación
                </a>
            </div>
        `;
        return;
    }
    
    const html = clasificaciones.map(cls => `
        <div class="d-flex align-items-center py-3 border-bottom activity-item">
            <div class="me-3">
                <div class="bg-success rounded-circle d-flex align-items-center justify-content-center" 
                     style="width: 40px; height: 40px;">
                    <i class="fas fa-camera text-white"></i>
                </div>
            </div>
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${cls.idVariedad.nombreComun}</h6>
                        <p class="mb-0 text-muted small">
                            <em>${cls.idVariedad.nombreCientifico}</em>
                        </p>
                    </div>
                    <span class="badge bg-success">${Math.round(cls.confianza * 100)}%</span>
                </div>
                <small class="text-muted">
                    <i class="fas fa-clock me-1"></i>
                    ${formatDate(cls.fechaClasificacion)}
                </small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Load model status
async function loadModelStatus() {
    try {
        const response = await fetch('/clasificacion/modelo/estado');
        
        if (!response.ok) {
            throw new Error('Error loading model status');
        }
        
        const data = await response.json();
        updateModelStatus(data);
        
    } catch (error) {
        console.error('Error loading model status:', error);
    }
}

// Update model status indicator
function updateModelStatus(status) {
    const indicators = document.querySelectorAll('.model-status');
    
    indicators.forEach(indicator => {
        const badgeClass = status.cargado ? 'badge bg-success' : 'badge bg-danger';
        const text = status.cargado ? 'Modelo IA: Disponible' : 'Modelo IA: No Disponible';
        
        indicator.innerHTML = `
            <span class="${badgeClass}">
                <i class="fas fa-brain me-1"></i>
                ${text}
            </span>
        `;
    });
}

// Update statistics (for real-time updates)
async function updateStatistics() {
    try {
        const response = await fetch('/reportes/api/estadisticas');
        const data = await response.json();
        updateStatisticsDisplay(data);
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Update recent activity (for real-time updates)
async function updateRecentActivity() {
    try {
        const response = await fetch('/clasificacion/historial?limit=5');
        const data = await response.json();
        updateRecentActivityDisplay(data.clasificaciones || []);
    } catch (error) {
        console.error('Error updating recent activity:', error);
    }
}

// Show error messages
function showErrorMessage(message) {
    const alertHtml = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const container = document.querySelector('main .container-fluid');
    if (container) {
        container.insertAdjacentHTML('afterbegin', alertHtml);
    }
}

// Show statistics error
function showStatisticsError() {
    const container = document.getElementById('estadisticas-container');
    if (container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error cargando estadísticas. 
                    <button class="btn btn-link p-0" onclick="loadStatistics()">
                        Intentar nuevamente
                    </button>
                </div>
            </div>
        `;
    }
}

// Show activity error
function showActivityError() {
    const container = document.getElementById('actividad-reciente');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error cargando actividad reciente.
                <button class="btn btn-link p-0" onclick="loadRecentActivity()">
                    Intentar nuevamente
                </button>
            </div>
        `;
    }
}

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Hoy ' + date.toLocaleTimeString('es-PE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else if (diffDays === 1) {
        return 'Ayer ' + date.toLocaleTimeString('es-PE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else {
        return date.toLocaleString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Utility Functions

// Format date
function formatearFecha(fecha) {
    const date = new Date(fecha);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `hace ${days} día${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
        return 'hace un momento';
    }
}

// Show confirm modal
function showConfirmModal(title, message, type = 'primary', confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
        // Create modal if it doesn't exist
        let modal = document.getElementById('confirmModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirmModal';
            modal.className = 'modal fade';
            modal.setAttribute('tabindex', '-1');
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="confirmModalTitle"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="confirmModalBody"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="confirmModalCancel" data-bs-dismiss="modal"></button>
                            <button type="button" class="btn" id="confirmModalConfirm"></button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Update modal content
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalBody').textContent = message;
        document.getElementById('confirmModalCancel').textContent = cancelText;
        
        const confirmBtn = document.getElementById('confirmModalConfirm');
        confirmBtn.textContent = confirmText;
        confirmBtn.className = `btn btn-${type}`;
        
        // Setup event listeners
        const handleConfirm = () => {
            resolve(true);
            bootstrap.Modal.getInstance(modal)?.hide();
            confirmBtn.removeEventListener('click', handleConfirm);
        };
        
        const handleCancel = () => {
            resolve(false);
            bootstrap.Modal.getInstance(modal)?.hide();
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        modal.addEventListener('hidden.bs.modal', handleCancel, { once: true });
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    });
}

// Show toast notification
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = getOrCreateToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${getToastColor(type)} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${getToastIcon(type)} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        delay: duration
    });
    
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
    
    return toast;
}

// Get or create toast container
function getOrCreateToastContainer() {
    let container = document.getElementById('toastContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
    }
    
    return container;
}

// Get toast color for type
function getToastColor(type) {
    const colors = {
        'success': 'success',
        'error': 'danger',
        'warning': 'warning',
        'info': 'info'
    };
    return colors[type] || 'info';
}

// Get toast icon for type
function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('Se ha producido un error inesperado', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('Error de conexión o procesamiento', 'error');
    event.preventDefault();
});

// Export functions for global access
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;
window.formatearFecha = formatearFecha;
window.loadStatistics = loadStatistics;
window.loadRecentActivity = loadRecentActivity;
window.updateStatistics = updateStatistics;