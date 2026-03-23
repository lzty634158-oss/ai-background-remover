-- D1 Database Schema for AI Background Remover

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  google_id TEXT UNIQUE,
  free_quota INTEGER DEFAULT 10,
  paid_credits INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Image records table
CREATE TABLE IF NOT EXISTS image_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  result_key TEXT NOT NULL,
  credits_used INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Guest trials table (by IP)
CREATE TABLE IF NOT EXISTS guest_trials (
  id TEXT PRIMARY KEY,
  ip_address TEXT UNIQUE NOT NULL,
  trial_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_image_records_user_id ON image_records(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_trials_ip ON guest_trials(ip_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
