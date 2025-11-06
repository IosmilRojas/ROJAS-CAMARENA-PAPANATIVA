const { app: electronApp, BrowserWindow } = require('electron');
const path = require('path');

// Evitar que el require provoque conexión automática si tu app la hace al require.
// Si tu PMV1/app.js está correctamente escrito (no conecta al require) puedes quitar la siguiente línea.
// process.env.SKIP_DB = 'true';

function resolveExpressModule(mod) {
  if (!mod) return null;
  // CommonJS export (app)
  if (typeof mod.listen === 'function') return mod;
  // ESM transpiled default
  if (mod.default && typeof mod.default.listen === 'function') return mod.default;
  // If module is a factory function that returns an app
  if (typeof mod === 'function') {
    try {
      const r = mod();
      if (r && typeof r.listen === 'function') return r;
    } catch (err) {
      // no-op
    }
  }
  return null;
}

async function startServerAndWindow() {
  // require después de ajustar env si es necesario
  const mod = require('./PMV1/app');
  const expressApp = resolveExpressModule(mod);

  if (!expressApp) {
    console.error('No se obtuvo instancia Express desde PMV1/app. Asegura que module.exports = app;');
    return;
  }

  const PORT = process.env.PORT || 34567;
  let server;
  try {
    server = expressApp.listen(PORT, () => {
      console.log(`Express escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error al arrancar el servidor Express:', err);
    return;
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { contextIsolation: true, sandbox: false }
  });
  win.loadURL(`http://localhost:${PORT}`);
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

electronApp.whenReady().then(async () => {
  await startServerAndWindow();
  electronApp.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) startServerAndWindow();
  });
});

electronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    electronApp.quit();
  }
});