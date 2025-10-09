// Clasificar Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeClasificar();
});

// Initialize classification page
function initializeClasificar() {
    setupFileUpload();
    setupFormValidation();
    setupProgressTracking();
}

// Setup file upload functionality
function setupFileUpload() {
    const fileInput = document.getElementById('imagen');
    const uploadContainer = document.querySelector('.file-upload-container');
    const previewContainer = document.getElementById('imagePreview');
    
    if (!fileInput || !uploadContainer) return;
    
    // Click to upload
    uploadContainer.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    setupDragAndDrop();
}

// Setup drag and drop
function setupDragAndDrop() {
    const uploadContainer = document.querySelector('.file-upload-container');
    
    if (!uploadContainer) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadContainer.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadContainer.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadContainer.classList.add('drag-over');
    }
    
    function unhighlight(e) {
        uploadContainer.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const fileInput = document.getElementById('imagen');
            fileInput.files = files;
            handleFileSelect({ target: { files: files } });
        }
    }
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!validateFile(file)) {
        return;
    }
    
    // Show preview
    showImagePreview(file);
    
    // Enable submit button
    const submitBtn = document.getElementById('clasificarBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

// Validate file
function validateFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
        showError('Formato de archivo no válido. Use JPG, PNG o WebP.');
        return false;
    }
    
    if (file.size > maxSize) {
        showError('El archivo es demasiado grande. Máximo 10MB permitido.');
        return false;
    }
    
    return true;
}

// Show image preview
function showImagePreview(file) {
    const previewContainer = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const imageInfo = document.getElementById('imageInfo');
    
    if (!previewContainer || !previewImg || !imageInfo) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        previewImg.src = e.target.result;
        imageInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
        previewContainer.style.display = 'block';
        
        // Add animation
        previewContainer.style.opacity = '0';
        previewContainer.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            previewContainer.style.transition = 'all 0.3s ease';
            previewContainer.style.opacity = '1';
            previewContainer.style.transform = 'translateY(0)';
        }, 100);
    };
    
    reader.readAsDataURL(file);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Setup form validation
function setupFormValidation() {
    const form = document.getElementById('clasificacionForm');
    
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmit);
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData();
    const fileInput = document.getElementById('imagen');
    
    if (!fileInput.files[0]) {
        showError('Por favor selecciona una imagen');
        return;
    }
    
    formData.append('imagen', fileInput.files[0]);
    
    // Show loading state
    showLoading();
    
    try {
        const response = await fetch('/clasificacion/procesar', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok && result.exito) {
            showResult(result.resultado);
        } else {
            showError(result.error || 'Error procesando imagen');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión. Intenta nuevamente.');
    } finally {
        hideLoading();
    }
}

// Show loading state
function showLoading() {
    const resultContainer = document.getElementById('resultadoContainer');
    const loadingState = document.getElementById('loadingState');
    const submitBtn = document.getElementById('clasificarBtn');
    
    if (resultContainer) resultContainer.style.display = 'none';
    if (loadingState) loadingState.style.display = 'block';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando...';
    }
}

// Hide loading state
function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    const submitBtn = document.getElementById('clasificarBtn');
    
    if (loadingState) loadingState.style.display = 'none';
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-brain me-2"></i>Clasificar con IA';
    }
}

// Show result
function showResult(resultado) {
    const resultContainer = document.getElementById('resultadoContainer');
    
    if (!resultContainer) return;
    
    const confidenceClass = getConfidenceClass(resultado.confianzaPorcentaje);
    const alternativesHtml = resultado.alternativas && resultado.alternativas.length > 0 
        ? resultado.alternativas.map(alt => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="text-muted">${alt.variedad}</span>
                <span class="badge bg-secondary">${alt.porcentaje}%</span>
            </div>
          `).join('')
        : '';
    
    const html = `
        <div class="result-success">
            <div class="text-center mb-4">
                <div class="result-icon bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                     style="width: 80px; height: 80px;">
                    <i class="fas fa-check fa-2x"></i>
                </div>
                <h4 class="text-success mb-2">¡Clasificación Completada!</h4>
                <p class="text-muted">Resultado del análisis con IA</p>
            </div>
            
            <div class="card border-success mb-3">
                <div class="card-body text-center">
                    <h5 class="card-title mb-3">
                        <i class="fas fa-seedling me-2 text-success"></i>
                        ${resultado.variedad.nombre}
                    </h5>
                    
                    <div class="mb-3">
                        <div class="progress mb-2" style="height: 25px;">
                            <div class="progress-bar ${confidenceClass}" 
                                 role="progressbar" 
                                 style="width: ${resultado.confianzaPorcentaje}%"
                                 aria-valuenow="${resultado.confianzaPorcentaje}"
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                                ${resultado.confianzaPorcentaje}% de confianza
                            </div>
                        </div>
                        <small class="text-muted">
                            Nivel de confianza: ${getConfidenceLabel(resultado.confianzaPorcentaje)}
                        </small>
                    </div>
                    
                    ${resultado.variedad.cientifico ? `
                        <div class="mb-3">
                            <strong>Nombre científico:</strong><br>
                            <em class="text-muted">${resultado.variedad.cientifico}</em>
                        </div>
                    ` : ''}
                    
                    ${resultado.variedad.descripcion ? `
                        <div class="mb-3">
                            <h6>Descripción:</h6>
                            <p class="text-muted small">${resultado.variedad.descripcion}</p>
                        </div>
                    ` : ''}
                    
                    ${alternativesHtml ? `
                        <div class="mt-3">
                            <h6>Otras posibilidades:</h6>
                            <div class="alternatives-list">
                                ${alternativesHtml}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="text-center">
                <small class="text-muted">
                    <i class="fas fa-clock me-1"></i>
                    Procesado en ${resultado.tiempoProcesamiento}ms
                    ${resultado.fechaClasificacion ? `| ${new Date(resultado.fechaClasificacion).toLocaleString('es-PE')}` : ''}
                </small>
            </div>
            
            <div class="text-center mt-3">
                <button class="btn btn-success me-2" onclick="resetForm()">
                    <i class="fas fa-plus me-1"></i>
                    Clasificar Otra
                </button>
                <a href="/reportes" class="btn btn-outline-info">
                    <i class="fas fa-chart-bar me-1"></i>
                    Ver Reportes
                </a>
            </div>
        </div>
    `;
    
    resultContainer.innerHTML = html;
    resultContainer.style.display = 'block';
    
    // Scroll to result
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Get confidence class for progress bar
function getConfidenceClass(percentage) {
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-danger';
}

// Get confidence label
function getConfidenceLabel(percentage) {
    if (percentage >= 80) return 'Alta';
    if (percentage >= 50) return 'Media';
    return 'Baja';
}

// Show error message
function showError(message) {
    const resultContainer = document.getElementById('resultadoContainer');
    
    if (!resultContainer) {
        alert(message);
        return;
    }
    
    const html = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Error:</strong> ${message}
        </div>
    `;
    
    resultContainer.innerHTML = html;
    resultContainer.style.display = 'block';
}

// Reset form
function resetForm() {
    const form = document.getElementById('clasificacionForm');
    const previewContainer = document.getElementById('imagePreview');
    const resultContainer = document.getElementById('resultadoContainer');
    const submitBtn = document.getElementById('clasificarBtn');
    
    if (form) form.reset();
    if (previewContainer) previewContainer.style.display = 'none';
    if (resultContainer) resultContainer.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
}

// Setup progress tracking
function setupProgressTracking() {
    // Track classification attempts for analytics
    let classificationAttempts = 0;
    
    const form = document.getElementById('clasificacionForm');
    if (form) {
        form.addEventListener('submit', () => {
            classificationAttempts++;
            console.log(`Classification attempt #${classificationAttempts}`);
        });
    }
}

// Export functions for global access
window.resetForm = resetForm;
window.handleDrop = function(event) {
    // This is handled by the setupDragAndDrop function
};
window.handleDragOver = function(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
};
window.handleDragLeave = function(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
};
window.handleFileSelect = handleFileSelect;