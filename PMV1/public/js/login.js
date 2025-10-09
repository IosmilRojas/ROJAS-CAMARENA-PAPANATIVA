// Login Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('correo');
    const passwordInput = document.getElementById('contraseña');
    const togglePassword = document.getElementById('togglePassword');
    
    // Email validation
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Form validation
    function validateForm() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        let isValid = true;
        
        // Reset previous validation states
        emailInput.classList.remove('is-invalid');
        passwordInput.classList.remove('is-invalid');
        
        // Validate email
        if (!email) {
            showFieldError(emailInput, 'El correo electrónico es requerido');
            isValid = false;
        } else if (!validateEmail(email)) {
            showFieldError(emailInput, 'Ingrese un correo electrónico válido');
            isValid = false;
        }
        
        // Validate password
        if (!password) {
            showFieldError(passwordInput, 'La contraseña es requerida');
            isValid = false;
        } else if (password.length < 6) {
            showFieldError(passwordInput, 'La contraseña debe tener al menos 6 caracteres');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Show field error
    function showFieldError(field, message) {
        field.classList.add('is-invalid');
        
        // Remove existing feedback
        const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Add new feedback
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;
        field.parentNode.appendChild(feedback);
    }
    
    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    
    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            if (!validateForm()) {
                e.preventDefault();
                return false;
            }
            
            // Show loading state
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Ingresando...';
            
            // The form will submit normally, so we don't need to prevent default
            // The loading state will be visible until the page redirects or reloads
        });
    }
    
    // Real-time validation
    emailInput.addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !validateEmail(email)) {
            showFieldError(this, 'Ingrese un correo electrónico válido');
        } else {
            this.classList.remove('is-invalid');
            const feedback = this.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.remove();
            }
        }
    });
    
    // Remove validation errors when user starts typing
    [emailInput, passwordInput].forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            const feedback = this.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.remove();
            }
        });
    });
    
    // Auto-focus first empty field
    if (!emailInput.value) {
        emailInput.focus();
    } else if (!passwordInput.value) {
        passwordInput.focus();
    }
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Enter key submits form
        if (e.key === 'Enter' && (emailInput.value || passwordInput.value)) {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});

// Show/hide password strength indicator
function showPasswordStrength(password) {
    // This can be enhanced to show password strength
    // For now, just basic length validation
    return password.length >= 6;
}

// Handle network errors
window.addEventListener('online', function() {
    const alerts = document.querySelectorAll('.alert-warning');
    alerts.forEach(alert => {
        if (alert.textContent.includes('conexión')) {
            alert.style.display = 'none';
        }
    });
});

window.addEventListener('offline', function() {
    const alertHtml = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
            <i class="fas fa-wifi me-2"></i>
            Sin conexión a internet. Verifica tu conexión.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const container = document.querySelector('.container .row .col-md-6');
    if (container) {
        container.insertAdjacentHTML('afterbegin', alertHtml);
    }
});