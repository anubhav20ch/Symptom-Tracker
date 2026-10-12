-- Phase 3 (CARE-4, CARE-5, CARE-6, CARE-7): revocable, scoped caregiver
-- share links with an access log the owning patient can read.

ALTER TABLE caregiver_shares ADD COLUMN revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE caregiver_shares ADD COLUMN label VARCHAR(255);
-- JSON array of section names ("symptoms", "medications", "appointments")
-- visible through this link. Defaults to everything, matching the
-- original (pre-CARE-6) behavior for any existing link.
ALTER TABLE caregiver_shares ADD COLUMN scope TEXT DEFAULT '["symptoms","medications","appointments"]';

CREATE TABLE IF NOT EXISTS caregiver_share_access_log (
  id SERIAL PRIMARY KEY,
  share_id INTEGER NOT NULL REFERENCES caregiver_shares(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
