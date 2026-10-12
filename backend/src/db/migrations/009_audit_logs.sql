-- Phase 1 (AUDIT-1, AUDIT-2, AUDIT-3): append-only audit trail for
-- authentication events and cross-ownership data access (a physician or
-- administrator viewing a record that is not their own account's data).
-- No UPDATE/DELETE endpoint is ever built against this table (AUDIT-3) --
-- that is enforced by never writing one, not by a database permission, so
-- it can be inspected directly by whoever operates the database.

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_type VARCHAR(20) NOT NULL,
  actor_id INTEGER,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INTEGER,
  request_id VARCHAR(100),
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
