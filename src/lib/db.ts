import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'database.sqlite');
export const db = new Database(dbPath);

// Initialize database tables
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      free_quota INTEGER DEFAULT 10,
      paid_credits INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS image_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      result_url TEXT NOT NULL,
      credits_used INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS guest_trials (
      id TEXT PRIMARY KEY,
      ip_address TEXT UNIQUE NOT NULL,
      trial_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_image_records_user_id ON image_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_guest_trials_ip ON guest_trials(ip_address);
  `);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getGuestTrials(ipAddress: string): number {
  const stmt = db.prepare('SELECT trial_count FROM guest_trials WHERE ip_address = ?');
  const result = stmt.get(ipAddress) as { trial_count: number } | undefined;
  return result?.trial_count || 0;
}

export function incrementGuestTrials(ipAddress: string): void {
  const existing = getGuestTrials(ipAddress);
  if (existing === 0) {
    const stmt = db.prepare(`
      INSERT INTO guest_trials (id, ip_address, trial_count) VALUES (?, ?, 1)
    `);
    stmt.run(generateId(), ipAddress);
  } else {
    const stmt = db.prepare(`
      UPDATE guest_trials SET trial_count = trial_count + 1, updated_at = CURRENT_TIMESTAMP WHERE ip_address = ?
    `);
    stmt.run(ipAddress);
  }
}
