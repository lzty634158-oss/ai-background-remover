-- Migration: Add user profile fields, login_history, and user_notifications tables
-- Run this in your Cloudflare D1 Console: https://dash.cloudflare.com/

-- ─── Step 1: Add new columns to users table ───────────────────────────
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN oauth_provider TEXT;
ALTER TABLE users ADD COLUMN oauth_refresh_token TEXT;

-- ─── Step 2: Create login_history table ──────────────────────────────
CREATE TABLE IF NOT EXISTS login_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  provider TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);

-- ─── Step 3: Create user_notifications table ───────────────────────────
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email_enabled INTEGER DEFAULT 1,
  system_enabled INTEGER DEFAULT 1,
  marketing_enabled INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ─── Rollback (if needed) ─────────────────────────────────────────────
-- DROP TABLE IF EXISTS login_history;
-- DROP TABLE IF EXISTS user_notifications;
-- (Cannot easily remove columns in D1, columns can be left unused)
