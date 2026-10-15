-- Phase 4 (PRIV-1, PRIV-3): explicit consent capture at registration and a
-- queryable account-deletion request/status flow.

CREATE TABLE IF NOT EXISTS consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_version VARCHAR(20) NOT NULL,
  accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user_id is ON DELETE SET NULL (not CASCADE) and user_email is captured at
-- request time so the completed/cancelled status of a deletion request
-- remains queryable (by the row itself, e.g. for an admin/support lookup)
-- even after PRIV-6 cascade deletion has removed the user row that
-- originated it. Deleting the row that records "this account was deleted"
-- at the same moment the account is deleted would defeat the point of it.
CREATE TABLE IF NOT EXISTS deletion_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
