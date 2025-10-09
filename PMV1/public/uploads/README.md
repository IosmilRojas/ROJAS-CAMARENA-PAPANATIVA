# Uploads Directory

Este directorio contiene las imágenes subidas por los usuarios para clasificación.

## Estructura:
- Las imágenes se guardan con nombres únicos que incluyen timestamp y ID de usuario
- Formatos soportados: JPG, PNG, WebP
- Tamaño máximo: 10MB por archivo

## Limpieza:
Se recomienda implementar un proceso de limpieza periódica para eliminar imágenes antiguas y ahorrar espacio de almacenamiento.

## Permisos:
Asegúrate de que el directorio tenga permisos de escritura para el proceso de Node.js.