function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

class ReportRepository {
  constructor({ dailyTotalsRepository, appUsageRepository, siteUsageRepository }) {
    this.dailyTotalsRepository = dailyTotalsRepository;
    this.appUsageRepository = appUsageRepository;
    this.siteUsageRepository = siteUsageRepository;
  }

  getDashboardSnapshot(currentSession = null) {
    const todayStart = startOfLocalDay();
    const tomorrowStart = addDays(todayStart, 1);
    const thirtyDaysAgo = addDays(todayStart, -29);
    const todayTotals = this.dailyTotalsRepository.getDay(formatLocalDate(todayStart));

    return {
      currentSession,
      today: {
        trackedSeconds: todayTotals.activeSeconds + todayTotals.idleSeconds,
        activeSeconds: todayTotals.activeSeconds,
        idleSeconds: todayTotals.idleSeconds
      },
      topApplications: this.appUsageRepository.getTopApplications(
        todayStart.toISOString(),
        tomorrowStart.toISOString()
      ),
      topSites: this.siteUsageRepository.getTopSites(
        todayStart.toISOString(),
        tomorrowStart.toISOString()
      ),
      last30DaysTopApplications: this.appUsageRepository.getTopApplicationsByDate(
        formatLocalDate(thirtyDaysAgo),
        formatLocalDate(todayStart)
      ),
      last30DaysTopSites: this.siteUsageRepository.getTopSitesByDate(
        formatLocalDate(thirtyDaysAgo),
        formatLocalDate(todayStart)
      ),
      history: this.dailyTotalsRepository.getHistory(30)
    };
  }

  getDayDetails(day) {
    const totals = this.dailyTotalsRepository.getDay(day);

    return {
      day,
      trackedSeconds: totals.activeSeconds + totals.idleSeconds,
      activeSeconds: totals.activeSeconds,
      idleSeconds: totals.idleSeconds,
      topApplications: this.appUsageRepository.getTopApplicationsByDate(day, day, 50),
      topSites: this.siteUsageRepository.getTopSitesByDate(day, day, 10)
    };
  }
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = { ReportRepository, startOfLocalDay, addDays, formatLocalDate };
