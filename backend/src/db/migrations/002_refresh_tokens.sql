-- Security hardening: JWT refresh token rotation (short-lived access tokens +
-- rotatable refresh tokens delivered via HttpOnly cookies). Only the SHA-256
-- hash of the refresh token is stored, never the raw token.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
