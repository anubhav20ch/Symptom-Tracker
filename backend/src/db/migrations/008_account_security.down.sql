DROP TABLE IF EXISTS password_reset_tokens;
ALTER TABLE users DROP COLUMN timezone;
ALTER TABLE users DROP COLUMN locked_until;
ALTER TABLE users DROP COLUMN last_failed_login_at;
ALTER TABLE users DROP COLUMN failed_login_attempts;
