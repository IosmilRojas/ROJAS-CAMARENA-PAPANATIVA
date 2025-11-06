# Configuración para MongoDB Atlas y Compass
# PAPACLICK - Proyecto de Clasificación de Papas

## Configuración MongoDB Atlas
- **Cluster**: cluster0.yczwuya.mongodb.net
- **Base de datos**: PapasDB
- **Usuario**: rolfi
- **Contraseña**: 321

## String de conexión MongoDB Atlas:
```
mongodb+srv://rolfi:321@cluster0.yczwuya.mongodb.net/PapasDB?retryWrites=true&w=majority&appName=Cluster0
```

## Configuración MongoDB Compass (Local)
Si prefieres usar MongoDB localmente con Compass:

1. Instalar MongoDB Community Server
2. Instalar MongoDB Compass
3. Usar la conexión: `mongodb://localhost:27017/PapasDB`

## Colecciones creadas automáticamente:
- **predicciones**: Almacena cada predicción con variedad, condición, probabilidad y timestamp
- **estadisticas**: Almacena estadísticas agregadas por fecha

## Estructura de datos en predicciones:
```json
{
  "_id": "ObjectId",
  "variedad": "Huayro|Peruanita|Amarilla",
  "condicion": "Apto|No Apto",
  "probabilidad": 0.95,
  "imagen": {
    "nombre": "imagen.jpg",
    "ruta": "uploads/123456-imagen.jpg",
    "tamaño": 1024000
  },
  "timestamp": "2025-09-24T17:30:00.000Z",
  "ip_usuario": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "createdAt": "2025-09-24T17:30:00.000Z",
  "updatedAt": "2025-09-24T17:30:00.000Z"
}
```

## APIs disponibles:
- POST `/api/prediccion` - Guardar nueva predicción
- GET `/api/predicciones` - Listar predicciones
- GET `/api/estadisticas` - Obtener estadísticas
- GET `/api/prediccion/:id` - Obtener predicción por ID
- DELETE `/api/predicciones` - Limpiar todas las predicciones

## Para iniciar el servidor:
```bash
npm start
# o para desarrollo
npm run dev
```