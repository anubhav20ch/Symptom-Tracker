DROP TABLE IF EXISTS caregiver_share_access_log;
ALTER TABLE caregiver_shares DROP COLUMN scope;
ALTER TABLE caregiver_shares DROP COLUMN label;
ALTER TABLE caregiver_shares DROP COLUMN revoked;
