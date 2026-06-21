class AppUsageRepository {
  constructor(db) {
    this.db = db;
  }

  increment({ sessionId, usageDate, appName, windowTitle, seconds, lastSeenAt }) {
    const existing = this.db.prepare(`
      SELECT id FROM app_usage
      WHERE session_id = ? AND usage_date = ? AND app_name = ? AND window_title = ?
    `).get(sessionId, usageDate, appName, windowTitle);

    if (existing) {
      this.db.prepare(`
        UPDATE app_usage
        SET duration_seconds = duration_seconds + ?, last_seen_at = ?, updated_at = ?
        WHERE id = ?
      `).run(seconds, lastSeenAt, lastSeenAt, existing.id);
      return;
    }

    this.db.prepare(`
      INSERT INTO app_usage
        (session_id, usage_date, app_name, window_title, duration_seconds, last_seen_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, usageDate, appName, windowTitle, seconds, lastSeenAt, lastSeenAt);
  }

  getTopApplications(dayStartIso, nextDayIso, limit = 8) {
    return this.db.prepare(`
      SELECT
        app_name AS appName,
        COALESCE(SUM(duration_seconds), 0) AS durationSeconds
      FROM app_usage
      WHERE last_seen_at >= ? AND last_seen_at < ?
      GROUP BY app_name
      ORDER BY durationSeconds DESC
      LIMIT ?
    `).all(dayStartIso, nextDayIso, limit);
  }
}

module.exports = { AppUsageRepository };
