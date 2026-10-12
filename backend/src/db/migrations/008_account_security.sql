-- Phase 1 (AUTH-13, AUTH-16, AUTH-17, AUTH-18): account lockout tracking,
-- a profile time zone, and password-reset tokens.

ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_failed_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN timezone VARCHAR(100) DEFAULT 'UTC';

-- Single-use, time-limited password reset tokens. Only the hash is stored,
-- matching the refresh-token pattern, so a stolen database export can't be
-- replayed as a reset link.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
