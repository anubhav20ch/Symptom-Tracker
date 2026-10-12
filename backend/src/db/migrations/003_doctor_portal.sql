-- Feature: Physician Portal / Doctor role authentication & review views.
-- Addresses the "Doctor authentication is missing" gap: doctors previously
-- existed only as free-text strings on appointments.

CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  specialty VARCHAR(255),
  npi_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_refresh_tokens (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nullable FK so existing free-text doctor_name entries keep working;
-- appointments can now optionally be linked to an authenticated doctor account.
ALTER TABLE appointments ADD COLUMN doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL;

-- Allows a physician to leave a clinical note visible to the patient.
ALTER TABLE appointments ADD COLUMN doctor_review_notes TEXT;
ALTER TABLE appointments ADD COLUMN reviewed_at TIMESTAMP;
