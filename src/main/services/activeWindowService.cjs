const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

function logDetectionError(error) {
  try {
    const logDir = path.join(process.env.XDG_STATE_HOME || path.join(process.env.HOME || '', '.local/state'), 'worktracker');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      path.join(logDir, 'launcher.log'),
      `[${new Date().toISOString()}] Active window detection failed: ${error.message}\n`
    );
  } catch (_ignored) {
    // Logging must never break tracking.
  }
}

function logDetectionDebug(message, details = {}) {
  try {
    const logDir = path.join(process.env.XDG_STATE_HOME || path.join(process.env.HOME || '', '.local/state'), 'worktracker');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      path.join(logDir, 'launcher.log'),
      `[${new Date().toISOString()}] Active window debug: ${message} ${JSON.stringify(details)}\n`
    );
  } catch (_ignored) {
    // Logging must never break tracking.
  }
}

function parsePropertyValue(output, property) {
  const line = output.split('\n').find((entry) => entry.startsWith(property));
  if (!line) {
    return '';
  }

  const quotedValues = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (quotedValues.length > 0) {
    return quotedValues[quotedValues.length - 1];
  }

  return line.split('=').slice(1).join('=').trim();
}

function parsePropertyValues(output, property) {
  const line = output.split('\n').find((entry) => entry.startsWith(property));
  if (!line) {
    return [];
  }

  const quotedValues = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (quotedValues.length > 0) {
    return quotedValues;
  }

  const value = line.split('=').slice(1).join('=').trim();
  return value ? [value] : [];
}

function parsePid(output) {
  const line = output.split('\n').find((entry) => entry.startsWith('_NET_WM_PID'));
  return Number(line?.match(/=\s*(\d+)/)?.[1] || 0);
}

function readProcessInfo(pid) {
  if (!pid) {
    return {};
  }

  try {
    const comm = fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim();
    const exe = fs.existsSync(`/proc/${pid}/exe`)
      ? fs.readlinkSync(`/proc/${pid}/exe`)
      : '';
    const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();

    return { comm, exe, cmdline };
  } catch (_error) {
    return {};
  }
}

function findRunningBrowserFallback() {
  try {
    const entries = fs.readdirSync('/proc', { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name));

    const browsers = [
      { appName: 'Google Chrome', patterns: [/^chrome$/i, /\/google\/chrome\/chrome/i] },
      { appName: 'Google Chrome', patterns: [/^google-chrome/i] },
      { appName: 'Chromium', patterns: [/^chromium/i] },
      { appName: 'Brave', patterns: [/brave/i] },
      { appName: 'Microsoft Edge', patterns: [/microsoft-edge|msedge/i] },
      { appName: 'Firefox', patterns: [/firefox/i] }
    ];

    for (const entry of entries) {
      const processInfo = readProcessInfo(Number(entry.name));
      const candidate = `${processInfo.comm || ''} ${processInfo.exe || ''} ${processInfo.cmdline || ''}`;
      const browser = browsers.find((item) => item.patterns.some((pattern) => pattern.test(candidate)));
      if (browser) {
        return {
          appName: browser.appName,
          windowTitle: ''
        };
      }
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\\/g, '/');
}

function detectKnownApp(candidates) {
  const knownMatchers = [
    [/^(code|code-oss|codium|vscodium)$/i, 'Visual Studio Code'],
    [/visual studio code|vscode|\/code$|\/code /i, 'Visual Studio Code'],
    [/^(cursor)$/i, 'Cursor'],
    [/^(chrome|google-chrome|google-chrome-stable)$/i, 'Google Chrome'],
    [/\/google\/chrome\/chrome|google-chrome|google chrome/i, 'Google Chrome'],
    [/^(chromium|chromium-browser)$/i, 'Chromium'],
    [/chromium/i, 'Chromium'],
    [/^(brave-browser|brave)$/i, 'Brave'],
    [/brave/i, 'Brave'],
    [/^(microsoft-edge|msedge)$/i, 'Microsoft Edge'],
    [/microsoft-edge|msedge/i, 'Microsoft Edge'],
    [/^(firefox|firefox-esr)$/i, 'Firefox'],
    [/firefox/i, 'Firefox'],
    [/^(slack)$/i, 'Slack'],
    [/slack/i, 'Slack'],
    [/^(discord)$/i, 'Discord'],
    [/discord/i, 'Discord'],
    [/^(spotify)$/i, 'Spotify'],
    [/spotify/i, 'Spotify'],
    [/^(postman)$/i, 'Postman'],
    [/postman/i, 'Postman'],
    [/^(insomnia)$/i, 'Insomnia'],
    [/insomnia/i, 'Insomnia'],
    [/^(figma-linux|figma)$/i, 'Figma'],
    [/figma/i, 'Figma'],
    [/^(gnome-terminal|org.gnome.terminal|kgx|konsole|alacritty|kitty)$/i, 'Terminal'],
    [/terminal|konsole|alacritty|kitty/i, 'Terminal'],
    [/^(nautilus|org.gnome.nautilus)$/i, 'Files'],
    [/nautilus/i, 'Files'],
    [/^(libreoffice|soffice)$/i, 'LibreOffice'],
    [/libreoffice|soffice/i, 'LibreOffice'],
    [/^(zoom|zoom-client)$/i, 'Zoom'],
    [/zoom/i, 'Zoom']
  ];

  for (const candidate of candidates.filter(Boolean)) {
    for (const [pattern, appName] of knownMatchers) {
      if (pattern.test(candidate)) {
        return appName;
      }
    }
  }

  return '';
}

function prettifyAppName(rawName, candidates = []) {
  const knownApp = detectKnownApp([rawName, ...candidates]);
  if (knownApp) {
    return knownApp;
  }

  const name = String(rawName || candidates.find(Boolean) || '').trim();

  if (!name) {
    return 'Unknown';
  }

  return name
    .split('/')
    .pop()
    .replace(/[-_.]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function getActiveWindowFromXprop() {
  const { stdout: rootOutput } = await execFileAsync('xprop', ['-root', '_NET_ACTIVE_WINDOW'], {
    timeout: 900
  });
  const windowId = rootOutput.match(/window id # (0x[0-9a-f]+)/i)?.[1];

  if (!windowId || windowId === '0x0') {
    throw new Error('No active X11 window found');
  }

  const { stdout: windowOutput } = await execFileAsync(
    'xprop',
    ['-id', windowId, 'WM_CLASS', '_NET_WM_NAME', 'WM_NAME', '_NET_WM_PID'],
    { timeout: 900 }
  );

  const wmClasses = parsePropertyValues(windowOutput, 'WM_CLASS');
  const netWindowName = parsePropertyValue(windowOutput, '_NET_WM_NAME');
  const wmName = parsePropertyValue(windowOutput, 'WM_NAME');
  const pid = parsePid(windowOutput);
  const processInfo = readProcessInfo(pid);
  const windowTitle = netWindowName || wmName || '';
  const candidates = [
    ...wmClasses,
    processInfo.comm,
    processInfo.exe,
    processInfo.cmdline,
    windowTitle
  ].map(normalizeToken);

  const appName = prettifyAppName(wmClasses[wmClasses.length - 1], candidates);

  if (appName === 'Unknown') {
    logDetectionDebug('unknown-xprop-window', {
      windowId,
      wmClasses,
      windowTitle,
      pid,
      processInfo
    });

    const browserFallback = findRunningBrowserFallback();
    if (browserFallback) {
      return browserFallback;
    }
  }

  return { appName, windowTitle };
}

async function getActiveWindowFromActiveWin() {
  const getWindows = await import('get-windows');
  const windowInfo = await getWindows.activeWindow();
  const candidates = [
    windowInfo?.owner?.name,
    windowInfo?.owner?.path,
    windowInfo?.title
  ].map(normalizeToken);

  return {
    appName: prettifyAppName(windowInfo?.owner?.name || windowInfo?.owner?.path, candidates),
    windowTitle: windowInfo?.title || ''
  };
}

async function getActiveWindow() {
  try {
    if (process.platform === 'linux') {
      try {
        const activeWinWindow = await getActiveWindowFromActiveWin();
        if (activeWinWindow.appName !== 'Unknown') {
          return activeWinWindow;
        }
      } catch (activeWinError) {
        logDetectionError(activeWinError);
      }

      return await getActiveWindowFromXprop();
    }

    return await getActiveWindowFromActiveWin();
  } catch (primaryError) {
    try {
      return await getActiveWindowFromActiveWin();
    } catch (fallbackError) {
      logDetectionError(fallbackError);
      logDetectionError(primaryError);
    }

    return {
      appName: 'Unknown',
      windowTitle: ''
    };
  }
}

module.exports = { getActiveWindow };
