const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('workTracker', {
  getState: () => ipcRenderer.invoke('tracking:get-state'),
  start: () => ipcRenderer.invoke('tracking:start'),
  stop: () => ipcRenderer.invoke('tracking:stop'),
  getDayDetails: (day) => ipcRenderer.invoke('tracking:get-day-details', day),
  onStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('tracking:state', listener);
    return () => ipcRenderer.removeListener('tracking:state', listener);
  }
});
