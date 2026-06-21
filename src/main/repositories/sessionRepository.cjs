class SessionRepository {
  constructor(db) {
    this.db = db;
  }

  create(startedAt) {
    const result = this.db.prepare(
      'INSERT INTO sessions (started_at, updated_at) VALUES (?, ?)'
    ).run(startedAt, startedAt);

    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  }

  findRunning() {
    return this.db.prepare(
      'SELECT * FROM sessions WHERE stopped_at IS NULL ORDER BY started_at DESC LIMIT 1'
    ).get();
  }

  stop(id, stoppedAt) {
    this.db.prepare(
      'UPDATE sessions SET stopped_at = ?, updated_at = ? WHERE id = ? AND stopped_at IS NULL'
    ).run(stoppedAt, stoppedAt, id);

    return this.findById(id);
  }

  incrementActive(id, seconds, updatedAt) {
    this.db.prepare(
      'UPDATE sessions SET active_seconds = active_seconds + ?, updated_at = ? WHERE id = ?'
    ).run(seconds, updatedAt, id);
  }

  incrementIdle(id, seconds, updatedAt) {
    this.db.prepare(
      'UPDATE sessions SET idle_seconds = idle_seconds + ?, updated_at = ? WHERE id = ?'
    ).run(seconds, updatedAt, id);
  }

  deleteOlderThan(cutoffIso) {
    this.db.prepare('DELETE FROM sessions WHERE started_at < ?').run(cutoffIso);
  }
}

module.exports = { SessionRepository };
