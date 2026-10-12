ALTER TABLE reminders DROP COLUMN prescribed_by_doctor_name;
ALTER TABLE reminders DROP COLUMN sound_alarm;
ALTER TABLE reminders DROP COLUMN prescribed_duration_days;
ALTER TABLE reminders DROP COLUMN expires_at;
ALTER TABLE reminders DROP COLUMN reminder_type;
ALTER TABLE reminders DROP COLUMN medication_id;

ALTER TABLE medications DROP COLUMN instructions;
ALTER TABLE medications DROP COLUMN duration_days;
ALTER TABLE medications DROP COLUMN appointment_id;
ALTER TABLE medications DROP COLUMN prescribed_by_doctor_id;

ALTER TABLE users DROP COLUMN user_tier;
