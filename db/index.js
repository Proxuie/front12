const Database = require('better-sqlite3');

const db = new Database(process.env.DB_PATH || './db.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      fio TEXT NOT NULL,
      roles TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      consent_pd INTEGER NOT NULL DEFAULT 0,
      legal_representative TEXT,
      birth_date TEXT,
      municipality TEXT,
      organization_id INTEGER,
      start_year INTEGER,
      disciplines TEXT,
      rank_type TEXT,
      rank_until TEXT,
      category TEXT,
      category_until TEXT,
      rusada_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS disciplines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT
    );
    CREATE TABLE IF NOT EXISTS age_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age_from INTEGER NOT NULL,
      age_to INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      discipline_id INTEGER NOT NULL,
      age_group_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      level TEXT NOT NULL,
      format TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      place TEXT,
      calendar_plan TEXT,
      calendar_number TEXT,
      applications_deadline TEXT,
      regulation_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      athlete_user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reject_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(competition_id, athlete_user_id)
    );
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      athlete_user_id INTEGER NOT NULL,
      place INTEGER,
      points REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(competition_id, athlete_user_id)
    );
    CREATE TABLE IF NOT EXISTS coach_athlete (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_user_id INTEGER NOT NULL,
      athlete_user_id INTEGER NOT NULL,
      discipline_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS judge_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      judge_user_id INTEGER NOT NULL,
      position TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      competition_id INTEGER,
      result_id INTEGER,
      requested_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_date TEXT,
      order_number TEXT,
      assigned_until TEXT,
      reject_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season INTEGER NOT NULL,
      discipline_id INTEGER NOT NULL,
      athlete_user_id INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { db, initDb };