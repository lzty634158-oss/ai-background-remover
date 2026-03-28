-- D1 Database Schema for AI Background Remover

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  google_id TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  last_login_at TEXT,
  oauth_provider TEXT,
  oauth_refresh_token TEXT,
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

-- Login history table
CREATE TABLE IF NOT EXISTS login_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  provider TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notification settings table
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email_enabled INTEGER DEFAULT 1,
  system_enabled INTEGER DEFAULT 1,
  marketing_enabled INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_image_records_user_id ON image_records(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_trials_ip ON guest_trials(ip_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);

-- Pending users table (for email verification)
CREATE TABLE IF NOT EXISTS pending_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);
CREATE INDEX IF NOT EXISTS idx_pending_users_code ON pending_users(verification_code);
