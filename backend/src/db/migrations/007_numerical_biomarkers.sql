-- Migration 007: Add Numerical Biomarkers to symptom_entries
-- Emotion scale: 1 (Sad/Agony) to 10 (Happy/Serene)

ALTER TABLE symptom_entries ADD COLUMN emotion_score REAL DEFAULT 5.0;
ALTER TABLE symptom_entries ADD COLUMN energy_level REAL DEFAULT 5.0;
ALTER TABLE symptom_entries ADD COLUMN stress_level REAL DEFAULT 5.0;
ALTER TABLE symptom_entries ADD COLUMN sleep_quality REAL DEFAULT 5.0;
ALTER TABLE symptom_entries ADD COLUMN functional_impairment REAL DEFAULT 3.0;
ALTER TABLE symptom_entries ADD COLUMN urgency_score REAL DEFAULT 25.0;
