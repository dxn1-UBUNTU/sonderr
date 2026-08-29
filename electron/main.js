const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'sonderr-desktop');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const APP_VERSION = '1.0.3';

let mainWindow = null;
let setupWindow = null;

function getIcon() {
  return path.join(__dirname, 'assets', 'icon.png');
}

function hasConfig() {
  return fs.existsSync(CONFIG_FILE);
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 720,
    height: 640,
    resizable: false,
    frame: true,
    title: 'Sonderr Desktop Setup',
    icon: getIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  setupWindow.loadFile(path.join(__dirname, 'setup.html'));
  setupWindow.on('closed', () => {
    setupWindow = null;
    if (!mainWindow) app.quit();
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: `Sonderr Desktop v${APP_VERSION}`,
    icon: getIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'agent.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (!setupWindow) app.quit();
  });
}

ipcMain.handle('check-config', () => hasConfig());

ipcMain.handle('read-config', async () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('launch-terminal', async () => {
  const terms = ['gnome-terminal', 'konsole', 'xfce4-terminal', 'alacritty', 'kitty', 'xterm'];
  for (const term of terms) {
    try {
      if (term === 'gnome-terminal') {
        spawn(term, ['--', 'bash', '-c', 'kilo; exec bash'], { detached: true });
      } else {
        spawn(term, ['-e', 'kilo'], { detached: true });
      }
      return { success: true };
    } catch (e) {
      continue;
    }
  }
  return { error: 'No terminal found' }
});

ipcMain.handle('get-app-version', () => APP_VERSION);

function createMenu() {
  const template = [
    {
      label: 'Sonderr Desktop',
      submenu: [
        { label: 'About Sonderr Desktop', click: () => shell.openExternal('https://sonderr-desktop.vercel.app') },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.toggleDevTools() }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  
  if (hasConfig()) {
    createMainWindow();
  } else {
    createSetupWindow();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (hasConfig()) createMainWindow();
      else createSetupWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
