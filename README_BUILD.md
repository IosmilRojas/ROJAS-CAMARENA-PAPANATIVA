# Build & Packaging (Windows)

Este documento explica cómo generar el icono `.ico` desde tu logo y cómo crear el instalador de Windows usando `electron-builder`.

Requisitos previos
- Node.js (16+ recomendado)
- En Windows: para crear el instalador NSIS instala NSIS: https://nsis.sourceforge.io/Download
- Acceso a Internet para descargar dependencias de npm

Pasos rápidos (PowerShell)

1) Instalar dependencias

```powershell
npm install
```

2) Generar `build/icon.ico` desde tu `public/assets/images/logo.jpg`

```powershell
npm run generate-icon
```

El script crea `build/icon.ico` y `build/icon.png`.

3) Probar la app con Electron (desarrollo)

```powershell
npm run electron:dev
```

4) Empaquetar / crear instalador (Windows)

```powershell
# Para crear carpeta con la app empaquetada (sin instalador)
npm run pack

# Para crear instalador (NSIS) y paquetes según la configuración
npm run dist
```

Notas y recomendaciones
- `electron-builder` usa `build/icon.ico` como icono para Windows. Si no existe, el empaquetado puede fallar o usar un icono por defecto.
- Tu aplicación arranca un servidor Express embebido. Asegúrate de que las variables de entorno necesarias (por ejemplo `MONGODB_URI`, `SESSION_SECRET`) estén disponibles en el entorno donde ejecutes el binario.
- Dependencias nativas (por ejemplo `sharp`) pueden requerir compilación en Windows; haz `npm install` en la máquina Windows donde vayas a buildar para asegurar que los binarios correctos se instalen.
- Si quieres builds automáticos, puedo agregar un workflow de GitHub Actions que cree los artefactos por cada release.

Problemas comunes
- `sharp` o módulos nativos fallan al instalar: instala las herramientas de compilación para Windows o usa la máquina Windows para `npm install`.
- NSIS no está instalado: instala NSIS para generar el instalador `.exe`.

Si quieres, preparo también el `GitHub Actions` para que cada `push` a `main` genere el instalador automáticamente y suba los artefactos a los Releases.
