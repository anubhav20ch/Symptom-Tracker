-- Feature: Doctor Active Appointment Prescriptions, Auto-Expiring Alarms & Casual User Mode

ALTER TABLE users ADD COLUMN user_tier VARCHAR(50) DEFAULT 'clinical';

ALTER TABLE medications ADD COLUMN prescribed_by_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL;
ALTER TABLE medications ADD COLUMN appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE medications ADD COLUMN duration_days INTEGER;
ALTER TABLE medications ADD COLUMN instructions TEXT;

ALTER TABLE reminders ADD COLUMN medication_id INTEGER REFERENCES medications(id) ON DELETE CASCADE;
ALTER TABLE reminders ADD COLUMN reminder_type VARCHAR(50) DEFAULT 'medication';
ALTER TABLE reminders ADD COLUMN expires_at TIMESTAMP;
ALTER TABLE reminders ADD COLUMN prescribed_duration_days INTEGER;
ALTER TABLE reminders ADD COLUMN sound_alarm BOOLEAN DEFAULT TRUE;
ALTER TABLE reminders ADD COLUMN prescribed_by_doctor_name VARCHAR(255);
