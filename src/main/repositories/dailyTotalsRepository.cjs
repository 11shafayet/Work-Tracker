class DailyTotalsRepository {
  constructor(db) {
    this.db = db;
  }

  incrementActive(day, seconds, updatedAt) {
    this.db.prepare(`
      INSERT INTO daily_totals (day, active_seconds, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(day) DO UPDATE SET
        active_seconds = active_seconds + excluded.active_seconds,
        updated_at = excluded.updated_at
    `).run(day, seconds, updatedAt);
  }

  incrementIdle(day, seconds, updatedAt) {
    this.db.prepare(`
      INSERT INTO daily_totals (day, idle_seconds, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(day) DO UPDATE SET
        idle_seconds = idle_seconds + excluded.idle_seconds,
        updated_at = excluded.updated_at
    `).run(day, seconds, updatedAt);
  }

  getDay(day) {
    return this.db.prepare(`
      SELECT
        COALESCE(active_seconds, 0) AS activeSeconds,
        COALESCE(idle_seconds, 0) AS idleSeconds
      FROM daily_totals
      WHERE day = ?
    `).get(day) || { activeSeconds: 0, idleSeconds: 0 };
  }

  getHistory(days) {
    return this.db.prepare(`
      WITH RECURSIVE dates(day, remaining) AS (
        SELECT date('now', 'localtime', '-' || (? - 1) || ' days'), ?
        UNION ALL
        SELECT date(day, '+1 day'), remaining - 1 FROM dates WHERE remaining > 1
      )
      SELECT
        dates.day AS day,
        COALESCE(d.active_seconds, 0) AS activeSeconds,
        COALESCE(d.idle_seconds, 0) AS idleSeconds
      FROM dates
      LEFT JOIN daily_totals d ON d.day = dates.day
      ORDER BY dates.day ASC
    `).all(days, days);
  }

  deleteOlderThan(day) {
    this.db.prepare('DELETE FROM daily_totals WHERE day < ?').run(day);
  }
}

module.exports = { DailyTotalsRepository };
