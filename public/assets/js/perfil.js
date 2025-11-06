/**
 * Script de Perfil de Usuario
 * Maneja la actualización del perfil con todos los campos
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.profile-form');
    const fotoPerfil = document.getElementById('fotoPerfil');
    const fileInputWrapper = document.querySelector('.file-input-wrapper');
    
    // Manejo de cambio de foto
    if (fotoPerfil) {
        fotoPerfil.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Mostrar preview
                const reader = new FileReader();
                reader.onload = function(event) {
                    const profileAvatarImg = document.querySelector('.profile-avatar-img');
                    const profileAvatarInitial = document.querySelector('.profile-avatar-initial');
                    
                    if (profileAvatarImg) {
                        profileAvatarImg.src = event.target.result;
                    } else {
                        const profileAvatar = document.querySelector('.profile-avatar');
                        const img = document.createElement('img');
                        img.src = event.target.result;
                        img.className = 'profile-avatar-img';
                        img.alt = 'Preview';
                        profileAvatar.innerHTML = '';
                        profileAvatar.appendChild(img);
                    }
                };
                reader.readAsDataURL(file);
                
                // Cambiar texto del label
                const label = document.querySelector('.file-input-label');
                if (label) {
                    label.innerHTML = '<i class="fas fa-check me-2"></i>' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + 'MB)';
                    label.style.background = 'linear-gradient(135deg, #20c997, #0d9656)';
                }
            }
        });
    }
    
    // Manejo del envío del formulario
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validaciones básicas
            const nombre = document.getElementById('nombre').value.trim();
            const correo = document.getElementById('correo').value.trim();
            const contraseñaActual = document.getElementById('contraseñaActual').value;
            const contraseñaNuevo = document.getElementById('contraseñaNuevo').value;
            
            // Validar que nombre y correo no estén vacíos
            if (!nombre) {
                mostrarAlerta('El nombre es obligatorio', 'error');
                return;
            }
            
            if (!correo) {
                mostrarAlerta('El correo es obligatorio', 'error');
                return;
            }
            
            // Validar formato de correo
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(correo)) {
                mostrarAlerta('Formato de correo inválido', 'error');
                return;
            }
            
            // Si hay contraseña nueva, validar que haya contraseña actual
            if (contraseñaNuevo && !contraseñaActual) {
                mostrarAlerta('Debes ingresar tu contraseña actual para cambiarla', 'error');
                return;
            }
            
            // Si hay contraseña actual, validar que haya contraseña nueva
            if (contraseñaActual && !contraseñaNuevo) {
                mostrarAlerta('Debes ingresar una nueva contraseña', 'error');
                return;
            }
            
            // Crear FormData para enviar archivos
            const formData = new FormData(form);
            
            try {
                // Mostrar indicador de carga
                const btnSubmit = form.querySelector('button[type="submit"]');
                const btnTextoOriginal = btnSubmit.innerHTML;
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
                
                // Enviar formulario
                const response = await fetch('/perfil/actualizar', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                // Restaurar botón
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = btnTextoOriginal;
                
                if (data.success) {
                    mostrarAlerta('Perfil actualizado exitosamente', 'success');
                    
                    // Recargar página después de 1.5 segundos
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    mostrarAlerta(data.mensaje || 'Error al actualizar el perfil', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarAlerta('Error al conectar con el servidor', 'error');
                
                // Restaurar botón
                const btnSubmit = form.querySelector('button[type="submit"]');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Cambios';
            }
        });
    }
    
    /**
     * Función para mostrar alertas
     */
    function mostrarAlerta(mensaje, tipo = 'info') {
        // Crear elemento de alerta
        const alerta = document.createElement('div');
        alerta.className = `alert alert-${tipo === 'error' ? 'danger' : 'success'} alert-dismissible fade show animate__animated animate__slideInDown`;
        alerta.style.position = 'fixed';
        alerta.style.top = '100px';
        alerta.style.right = '20px';
        alerta.style.maxWidth = '400px';
        alerta.style.zIndex = '9999';
        
        const icon = tipo === 'error' ? 'exclamation-circle' : 'check-circle';
        alerta.innerHTML = `
            <i class="fas fa-${icon} me-2"></i>${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(alerta);
        
        // Auto cerrar después de 5 segundos
        setTimeout(() => {
            alerta.remove();
        }, 5000);
    }
    
    /**
     * Validación en tiempo real del correo
     */
    const correoInput = document.getElementById('correo');
    if (correoInput) {
        correoInput.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                this.classList.add('is-invalid');
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = 'Formato de correo inválido';
                if (!this.nextElementSibling || !this.nextElementSibling.classList.contains('invalid-feedback')) {
                    this.parentNode.appendChild(feedback);
                }
            } else {
                this.classList.remove('is-invalid');
                const feedback = this.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.remove();
                }
            }
        });
    }
    
    /**
     * Auto-format de teléfono
     */
    const telefonoInput = document.getElementById('telefono');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function() {
            // Remover caracteres que no sean números
            let value = this.value.replace(/\D/g, '');
            
            // Formatear con máximo 15 dígitos
            if (value.length > 15) {
                value = value.substring(0, 15);
            }
            
            this.value = value;
        });
    }
    
    /**
     * Auto-format de DNI
     */
    const dniInput = document.getElementById('dni');
    if (dniInput) {
        dniInput.addEventListener('input', function() {
            // Remover caracteres que no sean números
            let value = this.value.replace(/\D/g, '');
            
            // Limitar a 8 o 11 dígitos (DNI o RUC)
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            
            this.value = value;
        });
    }
});
