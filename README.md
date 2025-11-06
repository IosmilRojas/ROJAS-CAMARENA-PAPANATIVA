# PAPACLICK – Sistema Inteligente de Clasificación de Papa

![Versión](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Estado](https://img.shields.io/badge/estado-Producción-green.svg)
![Licencia](https://img.shields.io/badge/Licencia-MIT-yellow.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow.js-2.x-orange.svg)
![Node.js](https://img.shields.io/badge/Node.js-16+-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)

## Descripción General

**PAPACLICK** es un sistema inteligente diseñado para la clasificación automática de variedades de papa nativa peruana mediante tecnologías de **Machine Learning** e **Inteligencia Artificial**.  
Utiliza **TensorFlow.js** para procesar imágenes en tiempo real y clasificar tres variedades principales: **Huayro**, **Peruanita** y **Amarilla**, además de determinar su aptitud para el consumo.

El sistema tiene como objetivo apoyar a productores y centros de acopio en la optimización del proceso de selección postcosecha, reduciendo errores humanos y mejorando la trazabilidad de la calidad del producto.

---

## Objetivo del Producto Mínimo Viable (PMV1)

Desarrollar un prototipo funcional capaz de:

- Clasificar automáticamente las variedades **Huayro**, **Peruanita** y **Amarilla**.  
- Determinar si una papa es **Apta** o **No Apta** para consumo.  
- Registrar los resultados en una base de datos **MongoDB Atlas**.  
- Operar mediante una **interfaz web responsiva e intuitiva**.  
- Alcanzar una **precisión mínima del 85%** en las pruebas de validación.

---

## Arquitectura del Sistema

```mermaid
graph TB
    A[Interfaz Web] --> B[TensorFlow.js]
    A --> C[Servidor Node.js]
    C --> D[MongoDB Atlas]
    B --> E[Clasificación IA]
    E --> F[Resultados]
    F --> D
