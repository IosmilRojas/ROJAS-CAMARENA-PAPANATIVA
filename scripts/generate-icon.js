const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const pngToIco = require('png-to-ico');

(async () => {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const src = path.join(projectRoot, 'public', 'assets', 'images', 'logo.jpg');
    const buildDir = path.join(projectRoot, 'build');
    await fs.mkdir(buildDir, { recursive: true });

    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const tempFiles = [];

    for (const size of sizes) {
      const out = path.join(os.tmpdir(), `logo_${size}.png`);
      await sharp(src)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(out);
      tempFiles.push(out);
    }

    const icoBuffer = await pngToIco(tempFiles);
    const icoPath = path.join(buildDir, 'icon.ico');
    await fs.writeFile(icoPath, icoBuffer);

    // Also copy a png for convenience
    const pngPath = path.join(buildDir, 'icon.png');
    await sharp(src).resize(256, 256, { fit: 'cover' }).png().toFile(pngPath);

    // Cleanup temp files
    for (const f of tempFiles) {
      try { await fs.unlink(f); } catch (e) { /* ignore */ }
    }

    console.log('✅ Icono generado en:', icoPath);
    console.log('✅ PNG de icono generado en:', pngPath);
    console.log('Siguiente: ejecutar `npm run dist` para crear el instalador (asegúrate de estar en Windows y tener NSIS instalado para el instalador).');
  } catch (err) {
    console.error('Error generando icono:', err);
    process.exit(1);
  }
})();
