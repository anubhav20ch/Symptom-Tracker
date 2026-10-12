ALTER TABLE appointments DROP COLUMN doctor_review_notes;
ALTER TABLE appointments DROP COLUMN reviewed_at;
ALTER TABLE appointments DROP COLUMN doctor_id;
DROP TABLE IF EXISTS doctor_refresh_tokens;
DROP TABLE IF EXISTS doctors;
