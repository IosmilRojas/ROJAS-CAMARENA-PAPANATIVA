const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'PapaClick - Sistema de Clasificación de Papa'
  });

  // Iniciar el servidor Node.js
  serverProcess = spawn('node', ['PMV1/app.js'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  // Esperar a que el servidor esté listo y luego cargar la página
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 3000);

  // Abrir DevTools en modo desarrollo
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});