const { ipcMain } = require('electron');

function registerIpc(trackingService) {
  ipcMain.handle('tracking:get-state', () => trackingService.getState());
  ipcMain.handle('tracking:start', () => trackingService.start());
  ipcMain.handle('tracking:stop', () => trackingService.stop());
  ipcMain.handle('tracking:get-day-details', (_event, day) => trackingService.getDayDetails(day));
}

module.exports = { registerIpc };
