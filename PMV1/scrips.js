let model;
// 🏷️ ETIQUETAS según requerimientos PMV1
const labels = [
  "Huayro Apto", "Huayro No Apto",
  "Peruanita Apto", "Peruanita No Apto", 
  "Amarilla Apto", "Amarilla No Apto"  // Manteniendo Amarilla según solicitado
];

const API_BASE_URL = 'http://localhost:5000/api';

async function loadModel() {
  try {
    model = await tf.loadLayersModel("web_model/model.json");
    document.getElementById("result").innerText = "Modelo cargado. Esperando imagen...";
    console.log("✅ Modelo TensorFlow cargado exitosamente");
  } catch (error) {
    console.error("❌ Error cargando modelo:", error);
    document.getElementById("result").innerText = "Error cargando modelo";
  }
}

async function guardarPrediccion(variedad, condicion, probabilidad, imagenFile = null) {
  const saveStatusDiv = document.getElementById('save-status');
  
  try {
    console.log('💾 Intentando guardar predicción:', { variedad, condicion, probabilidad });
    
    if (saveStatusDiv) {
      saveStatusDiv.innerHTML = '🔄 Conectando con base de datos...';
      saveStatusDiv.style.background = '#3498db';
    }
    
    const formData = new FormData();
    formData.append('variedad', variedad);
    formData.append('condicion', condicion);
    formData.append('probabilidad', probabilidad);
    
    if (imagenFile) {
      formData.append('imagen', imagenFile);
      console.log('📷 Imagen incluida:', imagenFile.name);
    }

    console.log('📡 Enviando a:', `${API_BASE_URL}/prediccion`);
    
    const response = await fetch(`${API_BASE_URL}/prediccion`, {
      method: 'POST',
      body: formData
    });

    console.log('📡 Respuesta recibida:', response.status);
    
    const data = await response.json();
    console.log('📄 Datos de respuesta:', data);
    
    if (response.ok) {
      console.log('✅ Predicción guardada correctamente:', data);
      
      if (saveStatusDiv) {
        saveStatusDiv.innerHTML = `✅ ¡Guardado exitoso! ID: ${data.id}`;
        saveStatusDiv.style.background = '#27ae60';
      }
      
      mostrarNotificacion('✅ Datos guardados en MongoDB Atlas', 'success');
      actualizarContador();
      
    } else {
      throw new Error(data.error || 'Error desconocido del servidor');
    }
  } catch (error) {
    console.error('❌ Error detallado al guardar:', error);
    
    if (saveStatusDiv) {
      saveStatusDiv.innerHTML = `❌ Error: ${error.message}`;
      saveStatusDiv.style.background = '#e74c3c';
    }
    
    mostrarNotificacion(`❌ Error: ${error.message}`, 'error');
  }
}

async function predict(imgElement) {
  try {
    // Realizar predicción con TensorFlow
    const tensor = tf.browser.fromPixels(imgElement)
      .resizeNearestNeighbor([224,224])
      .toFloat()
      .div(tf.scalar(255.0))
      .expandDims();
    
    const prediction = await model.predict(tensor).data();
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    const labelCompleta = labels[maxIndex]; // "Huayro No Apto" por ejemplo
    const partes = labelCompleta.split(" ");
    const variedad = partes[0]; // "Huayro"
    const condicion = partes.slice(1).join(" "); // "No Apto" (une todo después del primer espacio)
    const probabilidad = prediction[maxIndex];
    
    console.log("🔍 DEBUGGING PREDICCION:");
    console.log("   Label completa:", labelCompleta);
    console.log("   Partes:", partes);
    console.log("   Variedad:", variedad);
    console.log("   Condición:", condicion);
    console.log("   Probabilidad:", probabilidad);
    
    // Verificación adicional para asegurar formato correcto
    const condicionCorrecta = condicion === "Apto" ? "Apto" : "No Apto";
    console.log("   Condición corregida:", condicionCorrecta);
    
    // Mostrar resultado en el frontend
    document.getElementById("result").innerHTML =
      `<div class="prediction-result">
         <strong>🥔 Variedad:</strong> ${variedad}<br>
         <strong>📊 Condición:</strong> ${condicionCorrecta}<br>
         <strong>🎯 Confianza:</strong> ${(probabilidad * 100).toFixed(2)}%<br>
         <div class="confidence-bar">
           <div class="confidence-fill" style="width: ${probabilidad * 100}%"></div>
         </div>
         <small>💾 Guardando en base de datos...</small><br>
         <div id="save-status" style="margin-top: 10px; padding: 10px; background: #f39c12; color: white; border-radius: 5px;">
           ⏳ Estado: Procesando guardado...
         </div>
       </div>`;

    // Guardar en base de datos con la condición corregida
    const imageFile = document.getElementById("imageUpload").files[0];
    await guardarPrediccion(variedad, condicionCorrecta, probabilidad, imageFile);
    
    // Limpiar tensor de memoria
    tensor.dispose();
    
  } catch (error) {
    console.error("❌ Error en predicción:", error);
    document.getElementById("result").innerHTML = 
      `<div class="error">❌ Error procesando imagen: ${error.message}</div>`;
  }
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  // Crear elemento de notificación
  const notificacion = document.createElement('div');
  notificacion.className = `notification ${tipo}`;
  notificacion.textContent = mensaje;
  
  // Añadir al DOM
  document.body.appendChild(notificacion);
  
  // Mostrar con animación
  setTimeout(() => notificacion.classList.add('show'), 100);
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    notificacion.classList.remove('show');
    setTimeout(() => document.body.removeChild(notificacion), 300);
  }, 3000);
}

async function cargarEstadisticas() {
  try {
    const response = await fetch(`${API_BASE_URL}/estadisticas`);
    const stats = await response.json();
    
    if (response.ok) {
      document.getElementById('total-predicciones').textContent = stats.total_predicciones;
      document.getElementById('confianza-promedio').textContent = 
        `${(stats.promedio_confianza * 100).toFixed(1)}%`;
      
      // Actualizar gráfico de variedades
      actualizarGraficoVariedades(stats.por_variedad);
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

async function actualizarContador() {
  try {
    const response = await fetch(`${API_BASE_URL}/estadisticas`);
    const stats = await response.json();
    
    if (response.ok) {
      const contador = document.getElementById('contador-predicciones');
      if (contador) {
        contador.textContent = `Total predicciones: ${stats.total_predicciones}`;
      }
    }
  } catch (error) {
    console.error('Error actualizando contador:', error);
  }
}

function actualizarGraficoVariedades(datos) {
  const grafico = document.getElementById('grafico-variedades');
  if (!grafico) return;
  
  const variedades = ['Huayro', 'Peruanita', 'Amarilla'];
  let html = '<h3>📊 Distribución por Variedades</h3>';
  
  datos.forEach(item => {
    const { variedad, condicion } = item._id;
    const count = item.count;
    html += `
      <div class="stat-item">
        <span>${variedad} - ${condicion}:</span>
        <span class="count">${count}</span>
      </div>
    `;
  });
  
  grafico.innerHTML = html;
}

// Event Listeners - CORREGIDOS
document.addEventListener('DOMContentLoaded', () => {
  loadModel();
  actualizarContador();
  
  // Botón para subir archivo
  const fileUploadBtn = document.getElementById("file-upload-btn");
  const imageUpload = document.getElementById("imageUpload");
  
  if (fileUploadBtn && imageUpload) {
    fileUploadBtn.addEventListener("click", () => {
      imageUpload.click();
    });
  }

  // Manejar selección de archivo
  if (imageUpload) {
    imageUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        mostrarNotificacion('Por favor selecciona una imagen válida', 'error');
        return;
      }
      
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        mostrarNotificacion('La imagen es demasiado grande (máximo 5MB)', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = document.getElementById("preview");
        if (img) {
          img.src = event.target.result;
          img.style.display = 'block';
          img.onload = () => {
            predict(img);
          };
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Funcionalidad de cámara
  const cameraBtn = document.getElementById("camera-btn");
  const cameraSection = document.getElementById("camera-section");
  const cameraVideo = document.getElementById("camera-video");
  const capturePhoto = document.getElementById("capture-photo");
  const closeCamera = document.getElementById("close-camera");
  const cameraCanvas = document.getElementById("camera-canvas");
  
  let currentStream = null;

  if (cameraBtn) {
    cameraBtn.addEventListener("click", async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        
        if (cameraVideo) {
          cameraVideo.srcObject = currentStream;
          cameraSection.style.display = 'block';
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        mostrarNotificacion('No se pudo acceder a la cámara', 'error');
      }
    });
  }

  if (capturePhoto && cameraVideo && cameraCanvas) {
    capturePhoto.addEventListener("click", () => {
      const context = cameraCanvas.getContext('2d');
      cameraCanvas.width = cameraVideo.videoWidth;
      cameraCanvas.height = cameraVideo.videoHeight;
      
      context.drawImage(cameraVideo, 0, 0);
      
      // Convertir a blob y mostrar
      cameraCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const preview = document.getElementById("preview");
        
        if (preview) {
          preview.src = url;
          preview.style.display = 'block';
          preview.onload = () => {
            predict(preview);
          };
        }
        
        // Cerrar cámara
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
        }
        cameraSection.style.display = 'none';
      });
    });
  }

  if (closeCamera) {
    closeCamera.addEventListener("click", () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      cameraSection.style.display = 'none';
    });
  }
  
  // Actualizar estadísticas cada 30 segundos
  setInterval(cargarEstadisticas, 30000);
});
