# SymptomLog — Operational Runbook (SRS v1.1 MAIN-5)

This runbook documents operational procedures for maintaining, monitoring, deploying, and recovering SymptomLog components across production and staging environments.

---

## 1. Database Operations

### 1.1 PostgreSQL Backup & Point-in-Time Restore (Production)
In containerized or production PostgreSQL environments, scheduled WAL archiving and pg_dump backups protect against data loss.

#### Daily Full Logical Backup:
```bash
# Execute within the postgres container or via docker compose
docker compose exec postgres pg_dump -U postgres -d symptomlog -Fc -f /var/lib/postgresql/backups/symptomlog_$(date +%Y%m%d_%H%M%S).dump

# Verify backup integrity
pg_restore -l symptomlog_20261016_010000.dump > /dev/null && echo "Backup verified"
```

#### Point-in-Time Restore:
```bash
# 1. Stop backend services to sever active connections
docker compose stop backend

# 2. Terminate existing client sessions and drop/recreate database
docker compose exec postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'symptomlog' AND pid <> pg_backend_pid();"
docker compose exec postgres psql -U postgres -c "DROP DATABASE symptomlog;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE symptomlog;"

# 3. Restore from verified dump
docker compose exec postgres pg_restore -U postgres -d symptomlog -v /var/lib/postgresql/backups/symptomlog_TARGET.dump

# 4. Restart backend and verify readiness
docker compose start backend
curl -f http://localhost:5000/api/ready
```

### 1.2 Embedded SQLite Backup & Restore (Local / Edge)
When running with embedded SQLite (`backend/data/symptomlog.sqlite`):

```bash
# Hot backup utilizing SQLite VACUUM INTO (preserves WAL transaction consistency)
sqlite3 backend/data/symptomlog.sqlite "VACUUM INTO 'backend/data/symptomlog_backup_$(date +%Y%m%d).sqlite'"

# Restoration
cp backend/data/symptomlog_backup_TARGET.sqlite backend/data/symptomlog.sqlite
```

### 1.3 Database Migration Rollback (MAIN-7)
All migrations after `001_init.sql` carry a deterministic `.down.sql` script:

```bash
# Roll back the most recent migration file
cd backend
npm run migrate:down -- 014_privacy_lifecycle.down.sql

# To re-apply forward migrations:
npm run migrate
```

---

## 2. Machine Learning Model Lifecycle (ADMIN-12..15)

### 2.1 Candidate Dataset Ingestion & Validation (ADMIN-11)
Incoming training datasets must be in UTF-8 `.csv` format containing `text` and `label` columns with a minimum of 10 rows and 2 distinct classes.

```bash
# Validate dataset class distribution via Admin API
curl -X POST http://localhost:5000/api/admin/dataset/validate \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "dataset=@Symptom2Disease_candidate.csv"
```

### 2.2 Asynchronous Retraining Pipeline (ADMIN-12)
Uploading an approved dataset schedules an asynchronous background training job:

```bash
# Upload and trigger retraining
curl -X POST http://localhost:5000/api/admin/dataset/upload \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "dataset=@Symptom2Disease_candidate.csv"
# Response: { "job_id": "job-1729000000", "status": "running" }

# Poll job completion status
curl http://localhost:5000/api/admin/dataset/retrain/job-1729000000 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### 2.3 Model Activation & Quality Gating (ADMIN-13)
By clinical safety policy (ADMIN-13), candidate models are prohibited from activation unless holdout metrics satisfy:
- Holdout Accuracy &ge; 0.80 (80.0%)
- Macro F1-Score &ge; 0.75 (75.0%)

```bash
# Activate candidate version
curl -X POST http://localhost:5000/api/admin/models/activate \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"version": "v20261016_0100"}'
```

### 2.4 One-Click Emergency Rollback (ADMIN-14)
If an active model exhibits drift or unexpected triage outcomes in production, initiate immediate zero-downtime rollback:

```bash
# Roll back to the previous stable active model version
curl -X POST http://localhost:5000/api/admin/models/rollback \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 3. Incident Response Playbooks

### Incident 1: ML Microservice Unreachable / Offline
- **Detection**: `/api/ready` returns HTTP 503 with `"ml_service": "unreachable"`.
- **System Behavior**: Backend automatically degrades to heuristic rule-based keyword extraction and numerical score defaults (`extracted_keywords: ['fallback_nlp']`). No patient requests crash or return 500.
- **Remediation**:
  1. Inspect container logs: `docker compose logs --tail=100 ml_service`.
  2. Verify port 8001 listener: `netstat -ano | grep 8001`.
  3. Restart ML service container: `docker compose restart ml_service`.
  4. Verify recovery: `curl http://localhost:5000/api/ready` returns 200.

### Incident 2: Refresh Token Reuse Attack Detected (AUTH-19)
- **Detection**: Audit log records `action: 'refresh_token_reuse_detected'`. User receives HTTP 401 `REFRESH_REUSE_DETECTED`.
- **System Behavior**: Immediate invalidation of the entire refresh token family for that user session.
- **Remediation**:
  1. Advise user to change password immediately.
  2. Check audit logs for the actor's IP address:
     ```sql
     SELECT * FROM audit_logs WHERE action = 'refresh_token_reuse_detected' ORDER BY id DESC LIMIT 10;
     ```

### Incident 3: Report Checksum Tamper Alert (REPORT-4)
- **Detection**: Report download returns HTTP 409 `REPORT_CHECKSUM_MISMATCH`.
- **System Behavior**: Download aborted before byte transmission to protect clinical record integrity.
- **Remediation**:
  1. Inspect file system on `/uploads/reports/` for unauthorized write events.
  2. Regenerate clinical report via `POST /api/reports` to produce a fresh verified SHA-256 hash.

---

## 4. Maintenance & Retention Sweeps (PRIV-5, PRIV-6)

The background retention worker (`backend/src/services/retentionJob.js`) runs an hourly cascade sweep:
1. Purges expired account deletion requests (&gt; 24h grace window) and cascades deletion across all tables.
2. Hard-deletes revoked or expired caregiver links older than 90 days.
3. Purges immutable audit log entries older than 400 days.

To manually trigger an immediate maintenance sweep in staging or production:
```bash
node -e "require('./src/services/retentionJob').runRetentionSweep().then(() => process.exit(0));"
```
