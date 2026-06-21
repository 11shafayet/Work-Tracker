const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { powerMonitor } = require('electron');

const execFileAsync = promisify(execFile);

let lastDebugLogAt = 0;

function logIdleDebug(message, details = {}) {
  try {
    const now = Date.now();
    if (now - lastDebugLogAt < 60_000 && message === 'idle-source') {
      return;
    }

    lastDebugLogAt = now;
    const logDir = path.join(process.env.XDG_STATE_HOME || path.join(process.env.HOME || '', '.local/state'), 'worktracker');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      path.join(logDir, 'launcher.log'),
      `[${new Date().toISOString()}] Idle debug: ${message} ${JSON.stringify(details)}\n`
    );
  } catch (_ignored) {
    // Logging must never break tracking.
  }
}

function parseFirstNumber(output) {
  const numbers = String(output).match(/\d+/g) || [];
  return Number(numbers[numbers.length - 1] || 0);
}

async function getGnomeMutterIdleSeconds() {
  const { stdout } = await execFileAsync(
    'gdbus',
    [
      'call',
      '--session',
      '--dest',
      'org.gnome.Mutter.IdleMonitor',
      '--object-path',
      '/org/gnome/Mutter/IdleMonitor/Core',
      '--method',
      'org.gnome.Mutter.IdleMonitor.GetIdletime'
    ],
    { timeout: 800 }
  );

  return Math.floor(parseFirstNumber(stdout) / 1000);
}

async function getScreenSaverIdleSeconds() {
  const { stdout } = await execFileAsync(
    'gdbus',
    [
      'call',
      '--session',
      '--dest',
      'org.freedesktop.ScreenSaver',
      '--object-path',
      '/org/freedesktop/ScreenSaver',
      '--method',
      'org.freedesktop.ScreenSaver.GetSessionIdleTime'
    ],
    { timeout: 800 }
  );

  return parseFirstNumber(stdout);
}

async function getSystemIdleSeconds() {
  const electronIdleSeconds = powerMonitor.getSystemIdleTime();

  if (process.platform === 'linux') {
    try {
      const mutterIdleSeconds = await getGnomeMutterIdleSeconds();
      logIdleDebug('idle-source', { source: 'gnome-mutter', idleSeconds: mutterIdleSeconds, electronIdleSeconds });
      return mutterIdleSeconds;
    } catch (mutterError) {
      try {
        const screenSaverIdleSeconds = await getScreenSaverIdleSeconds();
        logIdleDebug('idle-source', {
          source: 'freedesktop-screensaver',
          idleSeconds: screenSaverIdleSeconds,
          electronIdleSeconds
        });
        return screenSaverIdleSeconds;
      } catch (screenSaverError) {
        logIdleDebug('idle-fallback', {
          electronIdleSeconds,
          mutterError: mutterError.message,
          screenSaverError: screenSaverError.message
        });
      }
    }
  }

  return electronIdleSeconds;
}

module.exports = { getSystemIdleSeconds };
