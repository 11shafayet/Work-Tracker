const { app } = require('electron');
const { getSystemIdleSeconds } = require('../src/main/services/idleService.cjs');

app.whenReady().then(async () => {
  try {
    const idleSeconds = await getSystemIdleSeconds();
    console.log(JSON.stringify({ idleSeconds }, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
