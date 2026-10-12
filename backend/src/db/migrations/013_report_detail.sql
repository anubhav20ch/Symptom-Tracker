-- Phase 3 (REPORT-3, REPORT-4): which sections a generated report included,
-- and a content checksum to detect tampering after generation.
ALTER TABLE reports ADD COLUMN sections TEXT DEFAULT '["symptoms","medications","appointments"]';
ALTER TABLE reports ADD COLUMN checksum VARCHAR(64);
