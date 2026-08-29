const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'sonderr');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const APP_VERSION = '1.0.7';

function getSecret() {
  const machineId = os.hostname() + os.userInfo().username;
  return crypto.createHash('sha256').update(machineId).digest('hex').slice(0, 32);
}

function encrypt(text, secret) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, 'sonderr-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(hash, secret) {
  const [ivHex, encrypted] = hash.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(secret, 'sonderr-salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(Buffer.from(encrypted, 'hex'), 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

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
    title: 'Sonderr Setup',
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
    title: `Sonderr v${APP_VERSION}`,
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
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8').trim();
    
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Try encrypted format
    }
    
    const secret = getSecret();
    const decrypted = decrypt(raw, secret);
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Failed to read config:', e);
    return null;
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const secret = getSecret();
    const encrypted = encrypt(JSON.stringify(config), secret);
    fs.writeFileSync(CONFIG_FILE, encrypted, { mode: 0o600 });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('launch-terminal', async () => {
  const sonderrPath = path.join(os.homedir(), '.local', 'bin', 'sonderr');
  const terms = [
    { cmd: 'xterm', args: ['-e', sonderrPath] },
    { cmd: 'kitty', args: [sonderrPath] },
    { cmd: 'alacritty', args: ['-e', sonderrPath] },
    { cmd: 'xfce4-terminal', args: ['--command', sonderrPath] },
    { cmd: 'konsole', args: ['-e', sonderrPath] },
    { cmd: 'gnome-terminal', args: ['--', 'bash', '-c', `export PATH="${os.homedir()}/.local/bin:$PATH"; ${sonderrPath}; exec bash`] }
  ];
  
  for (const term of terms) {
    try {
      const child = spawn(term.cmd, term.args, { 
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, PATH: path.join(os.homedir(), '.local/bin') + ':' + (process.env.PATH || '') }
      });
      child.unref();
      return { success: true };
    } catch (e) {
      continue;
    }
  }
  
  return { error: 'No compatible terminal found. Run sonderr manually in your terminal.' }
});

ipcMain.handle('get-app-version', () => APP_VERSION);

function createMenu() {
  const template = [
    {
      label: 'Sonderr',
      submenu: [
        { label: 'About Sonderr', click: () => shell.openExternal('https://sonderr.vercel.app') },
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
  
  autoUpdater.checkForUpdatesAndNotify();
  
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

autoUpdater.on('update-available', () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: 'A new version of Sonderr is ready to install.',
    buttons: ['Install Now', 'Later']
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
