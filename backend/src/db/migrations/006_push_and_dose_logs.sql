-- Feature: Real medicine alarms (Web Push, survives a closed/backgrounded
-- browser tab) and server-persisted dose history (replaces localStorage-only
-- "taken/skipped" tracking so doctors/caregivers can see real adherence).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(1024) UNIQUE NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id SERIAL PRIMARY KEY,
  reminder_id INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dose_date VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  note VARCHAR(255),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reminder_id, dose_date)
);

ALTER TABLE reminders ADD COLUMN last_notified_at TIMESTAMP;
