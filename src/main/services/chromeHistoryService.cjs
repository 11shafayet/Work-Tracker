const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const CHROME_EPOCH_OFFSET_MICROSECONDS = 11644473600000000;

function chromeTimeToUnixMs(chromeTime) {
  return Math.floor((Number(chromeTime) - CHROME_EPOCH_OFFSET_MICROSECONDS) / 1000);
}

function getChromeHistoryPaths() {
  const home = os.homedir();
  const roots = [
    path.join(home, '.config', 'google-chrome'),
    path.join(home, '.config', 'chromium'),
    path.join(home, '.config', 'BraveSoftware', 'Brave-Browser'),
    path.join(home, '.config', 'microsoft-edge')
  ];

  const paths = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) {
      continue;
    }

    for (const profile of fs.readdirSync(root)) {
      const historyPath = path.join(root, profile, 'History');
      if (fs.existsSync(historyPath)) {
        paths.push(historyPath);
      }
    }
  }

  return paths;
}

function getLatestChromeVisit(maxAgeMs = 15 * 60 * 1000) {
  const now = Date.now();

  for (const historyPath of getChromeHistoryPaths()) {
    const tempPath = path.join(os.tmpdir(), `worktracker-history-${process.pid}-${Date.now()}.db`);

    try {
      fs.copyFileSync(historyPath, tempPath);
      const db = new Database(tempPath, { readonly: true });
      const row = db.prepare(`
        SELECT url, title, last_visit_time AS lastVisitTime
        FROM urls
        WHERE url NOT LIKE 'chrome://%'
        ORDER BY last_visit_time DESC
        LIMIT 1
      `).get();
      db.close();

      if (!row) {
        continue;
      }

      const visitedAt = chromeTimeToUnixMs(row.lastVisitTime);
      if (now - visitedAt <= maxAgeMs) {
        return {
          url: row.url || '',
          title: row.title || ''
        };
      }
    } catch (_error) {
      // History can be locked or profile-specific. Try the next profile.
    } finally {
      try {
        fs.rmSync(tempPath, { force: true });
      } catch (_ignored) {
        // Best effort temp cleanup.
      }
    }
  }

  return null;
}

module.exports = { getLatestChromeVisit };
