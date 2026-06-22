const path = require('node:path');
const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain } = require('electron');
const { createConnection } = require('./database/connection.cjs');
const { SessionRepository } = require('./repositories/sessionRepository.cjs');
const { AppUsageRepository } = require('./repositories/appUsageRepository.cjs');
const { SiteUsageRepository } = require('./repositories/siteUsageRepository.cjs');
const { DailyTotalsRepository } = require('./repositories/dailyTotalsRepository.cjs');
const { ReportRepository } = require('./repositories/reportRepository.cjs');
const { TrackingService } = require('./services/trackingService.cjs');
const { registerIpc } = require('./ipc.cjs');

let mainWindow;
let tray;
let trackingService;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.setName('WorkTracker');

function createTrayIcon() {
  return nativeImage.createFromDataURL(
    'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill="#1f2937"/>
          <path d="M10 8h3l2 11 3-7h3l2 12h-3l-1-7-3 7h-3L10 8z" fill="#f9fafb"/>
        </svg>
      `)
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: 'WorkTracker',
    backgroundColor: '#f5f7fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.WORKTRACKER_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.WORKTRACKER_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('WorkTracker');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show WorkTracker',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Start Tracking',
      click: () => trackingService.start()
    },
    {
      label: 'Stop Tracking',
      click: () => trackingService.stop()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function bootstrap() {
  const db = createConnection(app);
  const sessionRepository = new SessionRepository(db);
  const appUsageRepository = new AppUsageRepository(db);
  const siteUsageRepository = new SiteUsageRepository(db);
  const dailyTotalsRepository = new DailyTotalsRepository(db);
  const reportRepository = new ReportRepository({
    dailyTotalsRepository,
    appUsageRepository,
    siteUsageRepository
  });
  trackingService = new TrackingService({
    sessionRepository,
    appUsageRepository,
    siteUsageRepository,
    dailyTotalsRepository,
    reportRepository
  });

  registerIpc(trackingService);
  trackingService.on('state', (state) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('tracking:state', state);
    });
  });
}

app.whenReady().then(() => {
  bootstrap();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('second-instance', () => {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  ipcMain.removeHandler('tracking:get-state');
  ipcMain.removeHandler('tracking:start');
  ipcMain.removeHandler('tracking:stop');
  ipcMain.removeHandler('tracking:get-day-details');
});
