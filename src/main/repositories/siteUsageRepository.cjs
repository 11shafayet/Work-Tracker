class SiteUsageRepository {
  constructor(db) {
    this.db = db;
  }

  increment({ sessionId, usageDate, siteName, pageTitle, seconds, lastSeenAt }) {
    const existing = this.db.prepare(`
      SELECT id FROM site_usage
      WHERE session_id = ? AND usage_date = ? AND site_name = ? AND page_title = ?
    `).get(sessionId, usageDate, siteName, pageTitle);

    if (existing) {
      this.db.prepare(`
        UPDATE site_usage
        SET duration_seconds = duration_seconds + ?, last_seen_at = ?, updated_at = ?
        WHERE id = ?
      `).run(seconds, lastSeenAt, lastSeenAt, existing.id);
      return;
    }

    this.db.prepare(`
      INSERT INTO site_usage
        (session_id, usage_date, site_name, page_title, duration_seconds, last_seen_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, usageDate, siteName, pageTitle, seconds, lastSeenAt, lastSeenAt);
  }

  getTopSites(dayStartIso, nextDayIso, limit = 50) {
    return this.db.prepare(`
      SELECT
        site_name AS siteName,
        COALESCE(SUM(duration_seconds), 0) AS durationSeconds
      FROM site_usage
      WHERE last_seen_at >= ? AND last_seen_at < ?
      GROUP BY site_name
      ORDER BY durationSeconds DESC
      LIMIT ?
    `).all(dayStartIso, nextDayIso, limit);
  }
}

module.exports = { SiteUsageRepository };
