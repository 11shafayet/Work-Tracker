const { EventEmitter } = require('node:events');
const { getActiveWindow } = require('./activeWindowService.cjs');
const { getSystemIdleSeconds } = require('./idleService.cjs');
const { classifySiteFromWindowTitle, isBrowserApp } = require('./siteClassifier.cjs');
const { getLatestChromeVisit, getRecentChromeVisits } = require('./chromeHistoryService.cjs');

const TICK_INTERVAL_MS = 1000;
const IDLE_THRESHOLD_SECONDS = 60;
const RETENTION_DAYS = 90;

function toIso(date = new Date()) {
  return date.toISOString();
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function subtractDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

class TrackingService extends EventEmitter {
  constructor({ sessionRepository, appUsageRepository, siteUsageRepository, dailyTotalsRepository, reportRepository }) {
    super();
    this.sessionRepository = sessionRepository;
    this.appUsageRepository = appUsageRepository;
    this.siteUsageRepository = siteUsageRepository;
    this.dailyTotalsRepository = dailyTotalsRepository;
    this.reportRepository = reportRepository;
    this.currentSession = this.sessionRepository.findRunning() || null;
    this.interval = null;
    this.isTicking = false;
    this.lastChromeHistoryPollAt = startOfLocalDay();
    this.seenChromeVisitKeys = new Set();

    if (this.currentSession) {
      this.startTimer();
    }
  }

  start() {
    if (this.currentSession && !this.currentSession.stopped_at) {
      return this.getState();
    }

    this.currentSession = this.sessionRepository.create(toIso());
    this.cleanupOldData();
    this.startTimer();
    this.emitState();
    return this.getState();
  }

  stop() {
    if (!this.currentSession || this.currentSession.stopped_at) {
      return this.getState();
    }

    this.currentSession = this.sessionRepository.stop(this.currentSession.id, toIso());
    this.stopTimer();
    this.emitState();
    return this.getState();
  }

  startTimer() {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);
  }

  stopTimer() {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = null;
  }

  async tick() {
    if (!this.currentSession || this.isTicking) {
      return;
    }

    this.isTicking = true;
    try {
      const now = new Date();
      const nowIso = toIso(now);
      const idleSeconds = await getSystemIdleSeconds();

      if (idleSeconds >= IDLE_THRESHOLD_SECONDS) {
        this.sessionRepository.incrementIdle(this.currentSession.id, 1, nowIso);
        this.dailyTotalsRepository.incrementIdle(localDateKey(now), 1, nowIso);
      } else {
        const activeWindow = await getActiveWindow();
        this.sessionRepository.incrementActive(this.currentSession.id, 1, nowIso);
        this.dailyTotalsRepository.incrementActive(localDateKey(now), 1, nowIso);
        this.appUsageRepository.increment({
          sessionId: this.currentSession.id,
          usageDate: localDateKey(now),
          appName: activeWindow.appName,
          windowTitle: activeWindow.windowTitle,
          seconds: 1,
          lastSeenAt: nowIso
        });

        this.recordRecentChromeVisits(now);

        if (isBrowserApp(activeWindow.appName)) {
          const latestVisit = /google chrome|chromium|brave|microsoft edge/i.test(activeWindow.appName)
            ? getLatestChromeVisit()
            : null;
          const site = classifySiteFromWindowTitle(
            activeWindow.windowTitle || latestVisit?.title || '',
            latestVisit?.url || ''
          );
          if (site) {
            this.siteUsageRepository.increment({
              sessionId: this.currentSession.id,
              usageDate: localDateKey(now),
              siteName: site.siteName,
              pageTitle: site.pageTitle,
              seconds: 1,
              lastSeenAt: nowIso
            });
          }
        }
      }

      this.currentSession = this.sessionRepository.findById(this.currentSession.id);
      this.emitState();
    } finally {
      this.isTicking = false;
    }
  }

  recordRecentChromeVisits(now) {
    const visits = getRecentChromeVisits(this.lastChromeHistoryPollAt);
    this.lastChromeHistoryPollAt = now.getTime();

    for (const visit of visits) {
      const visitKey = `${visit.url}|${visit.visitedAt}`;
      if (this.seenChromeVisitKeys.has(visitKey)) {
        continue;
      }

      this.seenChromeVisitKeys.add(visitKey);
      const site = classifySiteFromWindowTitle(visit.title, visit.url);
      if (!site) {
        continue;
      }

      const seenAt = new Date(visit.visitedAt || now.getTime()).toISOString();
      this.siteUsageRepository.increment({
        sessionId: this.currentSession.id,
        usageDate: localDateKey(new Date(visit.visitedAt || now.getTime())),
        siteName: site.siteName,
        pageTitle: site.pageTitle,
        seconds: 1,
        lastSeenAt: seenAt
      });
    }
  }

  cleanupOldData() {
    const cutoff = subtractDays(new Date(), RETENTION_DAYS);
    this.sessionRepository.deleteOlderThan(toIso(cutoff));
    this.dailyTotalsRepository.deleteOlderThan(localDateKey(cutoff));
  }

  getState() {
    const snapshot = this.reportRepository.getDashboardSnapshot(this.currentSession);

    return {
      isTracking: Boolean(this.currentSession && !this.currentSession.stopped_at),
      idleThresholdSeconds: IDLE_THRESHOLD_SECONDS,
      ...snapshot
    };
  }

  getDayDetails(day) {
    return this.reportRepository.getDayDetails(day);
  }

  emitState() {
    this.emit('state', this.getState());
  }
}

module.exports = { TrackingService };
