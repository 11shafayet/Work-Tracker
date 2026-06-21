const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function createConnection(app) {
  const dbPath = path.join(app.getPath('userData'), 'worktracker.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));

  return db;
}

module.exports = { createConnection };
