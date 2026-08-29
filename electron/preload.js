const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sonderr', {
  hasConfig: () => ipcRenderer.invoke('check-config'),
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  launchTerminal: () => ipcRenderer.invoke('launch-terminal')
});
