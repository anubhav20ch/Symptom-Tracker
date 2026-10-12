-- Phase 3 (APPT-5, APPT-8): appointment status history and reminder-sent
-- tracking. Slot-conflict (APPT-6) and future-only (APPT-7) are enforced
-- in application code and need no new columns.

CREATE TABLE IF NOT EXISTS appointment_status_history (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_type VARCHAR(20) NOT NULL,
  changed_by_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE appointments ADD COLUMN reminder_sent_at TIMESTAMP;
