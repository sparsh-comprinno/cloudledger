import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startScan } from './scanManager.js';
import { exportInventory } from './exporter.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'AWS Resource Inventory',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#020617',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Check for updates once window is ready (production only)
  mainWindow.once('ready-to-show', () => {
    if (!process.env.VITE_DEV_SERVER_URL) {
      setupAutoUpdater();
    }
  });
}

// ===== AUTO-UPDATER =====
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', { version: info.version });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', { version: info.version });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err);
  });

  autoUpdater.checkForUpdatesAndNotify();
}

// ===== APP LIFECYCLE =====
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ===== IPC HANDLERS =====
ipcMain.handle('start-scan', async (event, credentials) => {
  console.log('[CloudLedger] Starting scan with config:', {
    region: credentials.region,
    use_profile: credentials.use_profile,
    use_env_vars: credentials.use_env_vars,
    profile: credentials.profile,
    has_access_key: !!credentials.access_key_id,
  });

  const progressCallback = (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-progress', progress);
    }
  };

  try {
    const result = await startScan(credentials, progressCallback);
    console.log('[CloudLedger] Scan complete:', result.total_resources, 'resources found');
    return result;
  } catch (err) {
    console.error('[CloudLedger] Scan error:', err);
    throw err.message || String(err);
  }
});

ipcMain.handle('export-inventory', async (event, { format, resources, costData }) => {
  return await exportInventory(format, resources, costData);
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});
