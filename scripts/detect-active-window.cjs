const { app } = require('electron');
const { getActiveWindow } = require('../src/main/services/activeWindowService.cjs');

app.whenReady().then(async () => {
  try {
    const activeWindow = await getActiveWindow();
    console.log(JSON.stringify(activeWindow, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
