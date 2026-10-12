-- Phase 2 (ENTRY-8, ENTRY-9, ENTRY-10, TRIAGE-7, TRIAGE-9): structured body
-- region, follow-up linkage between entries, and the triage engine's own
-- version + specific rule id stored with each result (not only the
-- resulting tier). ENTRY-9 (onset/resolution) needed no new columns --
-- started_at/ended_at already existed in 001_init.sql.

ALTER TABLE symptom_entries ADD COLUMN body_region_code VARCHAR(50);
ALTER TABLE symptom_entries ADD COLUMN follow_up_to_entry_id INTEGER REFERENCES symptom_entries(id) ON DELETE SET NULL;
ALTER TABLE symptom_entries ADD COLUMN triage_version VARCHAR(20);
ALTER TABLE symptom_entries ADD COLUMN triage_rule_id VARCHAR(50);
