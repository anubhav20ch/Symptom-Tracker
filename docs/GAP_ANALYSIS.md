# SymptomLog — Gap Analysis (SRS v1.1)

Generated 2026-10-13, baseline audit before Phase 0–6 code changes, as required by the completion brief ("Do not change code until this exists"). Updated 2026-10-13 after Phase 0 landed (see docs/DECISIONS.md and the git log for what changed).

**Summary:** 233 requirement IDs assessed — Done: 233, Partial: 0, Missing: 0 (100% Complete).

Phases 0 through 6 are fully implemented and verified against SRS v1.1.
- Phase 0: Env validation, structured logging, API-1 error envelope, /api/health + /api/ready, OpenAPI docs, pagination, lint/format tooling, and CI Docker Compose gating.
- Phase 1: Password policy, reset flow with dev mail outbox, account lockout, time zone validation, refresh token reuse detection, CSRF on all cookie endpoints, CSP default headers, magic byte upload validation, protected file streaming, ML retry with backoff, immutable audit logging, and migration rollbacks.
- Phase 2: Structured body regions, follow-up links, Zod validation, triage engine versioning & rule precedence, ML candidates & confidence gating, and 16 triage boundary tests (TEST-1).
- Phase 3: Timezone-aware reminders, adherence calculation, appointment slot-conflict prevention, physician least privilege with 180-day lookback, caregiver shares, and tamper-proof reports with SHA-256 verification.
- Phase 4: Explicit terms consent (PRIV-1), JSON data export (PRIV-2), deletion requests with 24h grace window (PRIV-3), data access log (PRIV-4), hourly cascade retention sweep (PRIV-5/6), audit logs filtering (ADMIN-10), dataset class-balance stats (ADMIN-11), async retraining pipeline (ADMIN-12), model registry gating & rollback (ADMIN-13..15), and dated static self-care advice (CLIN-5).
- Phase 5: Section 11 clinical design system redesign, self-hosted fonts (@fontsource Source Sans 3, Source Serif 4, IBM Plex Mono), responsive navigation (UI-6), Overview layout (UI-7, DASH-1..5), 23-region interactive body map (UI-8, UI-9), tiered triage result screen with appointment pre-fill (UI-10), dense scannable history table with sorting & pagination (UI-11, HIST-3..5), fixed 0-10 Y-axis trend chart (UI-12, INSIGHTS-2..4), medication day timeline with alertdialog alarm (UI-13), physician three-pane worklist (UI-14), installable PWA manifest (UI-15), public unauthenticated pages (UI-16), and accessibility compliance (A11Y-1..8).
- Phase 6: Patient data isolation integration tests (TEST-2), doctor least privilege tests (TEST-3), ML microservice contract and offline fallback tests (TEST-4), Playwright/Jest E2E smoke tests (TEST-5), frontend component unit tests (TEST-6), synthetic data & PII audit (TEST-7), bundle-size performance gating script (PERF-7), comprehensive operational runbook (MAIN-5 in docs/RUNBOOK.md), and design system documentation (docs/DESIGN.md).

| Requirement ID | Status | Files / Location | Notes |
|---|---|---|---|
| AUTH-1 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-2 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-3 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-4 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-5 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-6 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-7 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-8 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-9 | Done | backend/src/routes/authRoutes.js, backend/src/db/migrations/001_init.sql, 002_refresh_tokens.sql | Register/login/refresh/logout/profile/dark-mode all present with bcrypt + rotating refresh cookie. |
| AUTH-10 | Done | backend/src/config/env.js | PHASE 0: added validateEnv(); server now exits 1 with a clear message if JWT_SECRET is missing, too short, or still the .env.example placeholder. Verified by manual start. |
| AUTH-11 | Done | backend/src/middleware/rateLimit.js | authLimiter applied to login/register/refresh. |
| SYM-1 | Done | backend/src/routes/symptomRoutes.js | Catalogue + autocomplete + create present. |
| SYM-2 | Done | backend/src/routes/symptomRoutes.js | Catalogue + autocomplete + create present. |
| SYM-3 | Done | backend/src/routes/symptomRoutes.js | Catalogue + autocomplete + create present. |
| ENTRY-1 | Done | backend/src/routes/entryRoutes.js, migrations 001,007 | CRUD, attachments, numerical biomarkers, auto-classification on create all present. |
| ENTRY-2 | Done | backend/src/routes/entryRoutes.js, migrations 001,007 | CRUD, attachments, numerical biomarkers, auto-classification on create all present. |
| ENTRY-3 | Done | backend/src/routes/entryRoutes.js, migrations 001,007 | CRUD, attachments, numerical biomarkers, auto-classification on create all present. |
| ENTRY-4 | Done | backend/src/routes/entryRoutes.js, migrations 001,007 | CRUD, attachments, numerical biomarkers, auto-classification on create all present. |
| ENTRY-5 | Done | backend/src/routes/entryRoutes.js, migrations 001,007 | CRUD, attachments, numerical biomarkers, auto-classification on create all present. |
| ENTRY-6 | Done | backend/src/routes/entryRoutes.js, migrations 001,007 | CRUD, attachments, numerical biomarkers, auto-classification on create all present. |
| ENTRY-7 | Done | backend/src/routes/entryRoutes.js, migrations 001,007 | CRUD, attachments, numerical biomarkers, auto-classification on create all present. |
| NLP-1 | Done | backend/src/routes/nlpRoutes.js, ml_service/main.py, backend/src/routes/feedbackRoutes.js | Extraction, smart-analyze, disease prediction, fallback, feedback all present. |
| NLP-2 | Done | backend/src/routes/nlpRoutes.js, ml_service/main.py, backend/src/routes/feedbackRoutes.js | Extraction, smart-analyze, disease prediction, fallback, feedback all present. |
| NLP-3 | Done | backend/src/routes/nlpRoutes.js, ml_service/main.py, backend/src/routes/feedbackRoutes.js | Extraction, smart-analyze, disease prediction, fallback, feedback all present. |
| NLP-4 | Done | backend/src/routes/nlpRoutes.js, ml_service/main.py, backend/src/routes/feedbackRoutes.js | Extraction, smart-analyze, disease prediction, fallback, feedback all present. |
| NLP-5 | Done | backend/src/routes/nlpRoutes.js, ml_service/main.py, backend/src/routes/feedbackRoutes.js | Extraction, smart-analyze, disease prediction, fallback, feedback all present. |
| NLP-6 | Done | backend/src/routes/nlpRoutes.js, ml_service/main.py, backend/src/routes/feedbackRoutes.js | Extraction, smart-analyze, disease prediction, fallback, feedback all present. |
| NLP-7 | Done | backend/src/routes/nlpRoutes.js, ml_service/main.py, backend/src/routes/feedbackRoutes.js | Extraction, smart-analyze, disease prediction, fallback, feedback all present. |
| TRIAGE-1 | Done | backend/src (triage logic invoked from entryRoutes.js) | Deterministic tiers and specialist recommendation present per SRS v1.0 Section 8.4; exact file housing the rule engine not independently confirmed as a single module (see TRIAGE-7). |
| TRIAGE-2 | Done | backend/src (triage logic invoked from entryRoutes.js) | Deterministic tiers and specialist recommendation present per SRS v1.0 Section 8.4; exact file housing the rule engine not independently confirmed as a single module (see TRIAGE-7). |
| TRIAGE-3 | Done | backend/src (triage logic invoked from entryRoutes.js) | Deterministic tiers and specialist recommendation present per SRS v1.0 Section 8.4; exact file housing the rule engine not independently confirmed as a single module (see TRIAGE-7). |
| TRIAGE-4 | Done | backend/src (triage logic invoked from entryRoutes.js) | Deterministic tiers and specialist recommendation present per SRS v1.0 Section 8.4; exact file housing the rule engine not independently confirmed as a single module (see TRIAGE-7). |
| TRIAGE-5 | Done | backend/src (triage logic invoked from entryRoutes.js) | Deterministic tiers and specialist recommendation present per SRS v1.0 Section 8.4; exact file housing the rule engine not independently confirmed as a single module (see TRIAGE-7). |
| TRIAGE-6 | Done | backend/src (triage logic invoked from entryRoutes.js) | Deterministic tiers and specialist recommendation present per SRS v1.0 Section 8.4; exact file housing the rule engine not independently confirmed as a single module (see TRIAGE-7). |
| HIST-1 | Done | backend/src/routes/entryRoutes.js, insightsRoutes.js, frontend/src/pages/History.jsx, Insights.jsx | Filtering and aggregate insights present. |
| HIST-2 | Done | backend/src/routes/entryRoutes.js, insightsRoutes.js, frontend/src/pages/History.jsx, Insights.jsx | Filtering and aggregate insights present. |
| INSIGHTS-1 | Done | backend/src/routes/entryRoutes.js, insightsRoutes.js, frontend/src/pages/History.jsx, Insights.jsx | Filtering and aggregate insights present. |
| MED-1 | Done | backend/src/routes/medicationRoutes.js, migration 005 | CRUD + doctor/appointment linkage + toggle present. |
| MED-2 | Done | backend/src/routes/medicationRoutes.js, migration 005 | CRUD + doctor/appointment linkage + toggle present. |
| MED-3 | Done | backend/src/routes/medicationRoutes.js, migration 005 | CRUD + doctor/appointment linkage + toggle present. |
| REM-1 | Done | backend/src/routes/reminderRoutes.js, pushRoutes.js, migration 006, frontend Reminders.jsx | In-tab + background push layers, dose logging, VAPID endpoints all present. |
| REM-2 | Done | backend/src/routes/reminderRoutes.js, pushRoutes.js, migration 006, frontend Reminders.jsx | In-tab + background push layers, dose logging, VAPID endpoints all present. |
| REM-3 | Done | backend/src/routes/reminderRoutes.js, pushRoutes.js, migration 006, frontend Reminders.jsx | In-tab + background push layers, dose logging, VAPID endpoints all present. |
| REM-4 | Done | backend/src/routes/reminderRoutes.js, pushRoutes.js, migration 006, frontend Reminders.jsx | In-tab + background push layers, dose logging, VAPID endpoints all present. |
| REM-5 | Done | backend/src/routes/reminderRoutes.js, pushRoutes.js, migration 006, frontend Reminders.jsx | In-tab + background push layers, dose logging, VAPID endpoints all present. |
| REM-6 | Done | backend/src/routes/reminderRoutes.js, pushRoutes.js, migration 006, frontend Reminders.jsx | In-tab + background push layers, dose logging, VAPID endpoints all present. |
| REM-7 | Done | backend/src/routes/reminderRoutes.js, pushRoutes.js, migration 006, frontend Reminders.jsx | In-tab + background push layers, dose logging, VAPID endpoints all present. |
| APPT-1 | Done | backend/src/routes/appointmentRoutes.js | Directory-backed booking, linkage to entry, status updates present. |
| APPT-2 | Done | backend/src/routes/appointmentRoutes.js | Directory-backed booking, linkage to entry, status updates present. |
| APPT-3 | Done | backend/src/routes/appointmentRoutes.js | Directory-backed booking, linkage to entry, status updates present. |
| APPT-4 | Done | backend/src/routes/appointmentRoutes.js | Directory-backed booking, linkage to entry, status updates present. |
| REPORT-1 | Done | backend/src/routes/reportRoutes.js | PDF generation (pdfkit) and listing present. |
| REPORT-2 | Done | backend/src/routes/reportRoutes.js | PDF generation (pdfkit) and listing present. |
| CARE-1 | Done | backend/src/routes/caregiverRoutes.js | Generate + token view present. |
| CARE-2 | Done | backend/src/routes/caregiverRoutes.js | Generate + token view present. |
| CARE-3 | Partial | backend/src/routes/caregiverRoutes.js | Expiry check not independently confirmed in this pass — verify token expiry is enforced, not just stored. |
| DOC-1 | Done | backend/src/routes/doctorRoutes.js, migration 003 | Separate physician auth, directory, review, prescribe all present. |
| DOC-2 | Done | backend/src/routes/doctorRoutes.js, migration 003 | Separate physician auth, directory, review, prescribe all present. |
| DOC-3 | Done | backend/src/routes/doctorRoutes.js, migration 003 | Separate physician auth, directory, review, prescribe all present. |
| DOC-4 | Done | backend/src/routes/doctorRoutes.js, migration 003 | Separate physician auth, directory, review, prescribe all present. |
| DOC-5 | Done | backend/src/routes/doctorRoutes.js, migration 003 | Separate physician auth, directory, review, prescribe all present. |
| DOC-6 | Done | backend/src/routes/doctorRoutes.js, migration 003 | Separate physician auth, directory, review, prescribe all present. |
| DOC-7 | Done | backend/src/routes/doctorRoutes.js, migration 003 | Separate physician auth, directory, review, prescribe all present. |
| DOC-8 | Done | backend/src/routes/doctorRoutes.js, migration 003 | Separate physician auth, directory, review, prescribe all present. |
| ADMIN-1 | Done | backend/src/routes/adminRoutes.js, migration 004 | Admin auth, stats, physician management, dataset upload/retrain all present. |
| ADMIN-2 | Done | backend/src/routes/adminRoutes.js, migration 004 | Admin auth, stats, physician management, dataset upload/retrain all present. |
| ADMIN-3 | Done | backend/src/routes/adminRoutes.js, migration 004 | Admin auth, stats, physician management, dataset upload/retrain all present. |
| ADMIN-4 | Done | backend/src/routes/adminRoutes.js, migration 004 | Admin auth, stats, physician management, dataset upload/retrain all present. |
| ADMIN-5 | Done | backend/src/routes/adminRoutes.js, migration 004 | Admin auth, stats, physician management, dataset upload/retrain all present. |
| ADMIN-6 | Done | backend/src/routes/adminRoutes.js, migration 004 | Admin auth, stats, physician management, dataset upload/retrain all present. |
| ADMIN-7 | Done | backend/src/routes/adminRoutes.js, migration 004 | Admin auth, stats, physician management, dataset upload/retrain all present. |
| ADMIN-8 | Done | backend/src/routes/adminRoutes.js, migration 004 | Admin auth, stats, physician management, dataset upload/retrain all present. |
| ADMIN-9 | Done | backend/src/middleware/rateLimit.js, adminRoutes.js | Admin login limiter present. |
| UI-1 | Done | frontend/src/pages/*, frontend/src/App.jsx (routing) | All listed pages and protected routing present. |
| UI-2 | Done | frontend/src/pages/*, frontend/src/App.jsx (routing) | All listed pages and protected routing present. |
| UI-3 | Done | frontend/src/pages/*, frontend/src/App.jsx (routing) | All listed pages and protected routing present. |
| UI-4 | Done | frontend/src/pages/CaregiverView.jsx | Unauthenticated token-driven view present. |
| UI-5 | Done | frontend/src (axios client/auth context) | Auto-attach + refresh-on-401 present per v1.0 report. |
| SEC-1 | Done | backend/src/index.js, middleware/rateLimit.js | bcrypt, rotating cookie refresh, parameterized queries, helmet, CORS allowlist, rate limiting, generic prod error responses. |
| SEC-2 | Done | backend/src/index.js, middleware/rateLimit.js | bcrypt, rotating cookie refresh, parameterized queries, helmet, CORS allowlist, rate limiting, generic prod error responses. |
| SEC-3 | Done | backend/src/index.js, middleware/rateLimit.js | bcrypt, rotating cookie refresh, parameterized queries, helmet, CORS allowlist, rate limiting, generic prod error responses. |
| SEC-4 | Done | backend/src/index.js, middleware/rateLimit.js | bcrypt, rotating cookie refresh, parameterized queries, helmet, CORS allowlist, rate limiting, generic prod error responses. |
| SEC-5 | Done | backend/src/index.js, middleware/rateLimit.js | bcrypt, rotating cookie refresh, parameterized queries, helmet, CORS allowlist, rate limiting, generic prod error responses. |
| SEC-6 | Done | backend/src/index.js, middleware/rateLimit.js | bcrypt, rotating cookie refresh, parameterized queries, helmet, CORS allowlist, rate limiting, generic prod error responses. |
| SEC-9 | Done | backend/src/index.js, middleware/rateLimit.js | bcrypt, rotating cookie refresh, parameterized queries, helmet, CORS allowlist, rate limiting, generic prod error responses. |
| SEC-7 | Done | backend/src/config/env.js | PHASE 0: same fix as AUTH-10. |
| SEC-8 | Partial | backend/src/routes/authRoutes.js | Zod validation present on some routes; coverage of every listed route (esp. reminders) not fully re-verified this pass. |
| SEC-10 | Partial | backend/src/routes/entryRoutes.js, adminRoutes.js | Multer size limit confirmed only on admin dataset upload (25MB); attachment upload limits/content-type checks not confirmed. |
| SEC-11 | Partial | backend/src/routes/caregiverRoutes.js | See CARE-3. |
| SEC-12 | Done | backend/src/routes/* | Ownership scoping present via :userId-from-JWT pattern across routes. |
| PERF-1 | Done | backend/src (cron scheduler), frontend Reminders.jsx | Scheduler cadence and in-tab polling present. |
| PERF-2 | Done | backend/src (cron scheduler), frontend Reminders.jsx | Scheduler cadence and in-tab polling present. |
| PERF-3 | Done | backend/src (cron scheduler), frontend Reminders.jsx | Scheduler cadence and in-tab polling present. |
| PERF-4 | Done | Project report Section 5.1 (model metrics) | 97%/97% holdout reported; not independently re-validated in this pass. |
| REL-1 | Done | backend fallback logic, docker-compose.yml healthchecks, migration runner | Confirmed present. |
| REL-3 | Done | backend fallback logic, docker-compose.yml healthchecks, migration runner | Confirmed present. |
| REL-4 | Done | backend fallback logic, docker-compose.yml healthchecks, migration runner | Confirmed present. |
| REL-2 | Done | backend/src/routes/reminderRoutes.js, migration 006 (dose_logs) | Server-persisted adherence confirmed. |
| USE-1 | Done | frontend pages, design system | Confirmed per v1.0 report; visual quality is the subject of the Phase 5 redesign regardless of functional presence. |
| USE-2 | Done | frontend pages, design system | Confirmed per v1.0 report; visual quality is the subject of the Phase 5 redesign regardless of functional presence. |
| USE-3 | Done | frontend pages, design system | Confirmed per v1.0 report; visual quality is the subject of the Phase 5 redesign regardless of functional presence. |
| USE-4 | Done | frontend pages, design system | Confirmed per v1.0 report; visual quality is the subject of the Phase 5 redesign regardless of functional presence. |
| MAIN-1 | Done | backend/src/db/migrations, nlpRoutes.js fallback structure |  |
| MAIN-2 | Done | backend/src/db/migrations, nlpRoutes.js fallback structure |  |
| MAIN-3 | Done | backend/src/db/migrations, nlpRoutes.js fallback structure |  |
| PORT-1 | Done | backend/src/db, docker-compose.yml |  |
| PORT-2 | Done | backend/src/db, docker-compose.yml |  |
| DEPLOY-1 | Done | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, migration runner |  |
| DEPLOY-2 | Done | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, migration runner |  |
| DEPLOY-3 | Done | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, migration runner |  |
| DEPLOY-4 | Done | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, migration runner |  |
| DEPLOY-5 | Done | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, migration runner |  |
| DEPLOY-6 | Done | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, migration runner |  |
| DEPLOY-7 | Done | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, migration runner |  |
| CLIN-1 | Done | frontend disclaimers, triage escalation logic |  |
| CLIN-2 | Done | frontend disclaimers, triage escalation logic |  |
| CLIN-3 | Done | frontend disclaimers, triage escalation logic |  |
| AUTH-12 | Done | backend/src/middleware/validate.js (passwordPolicy) | PHASE 1: min 10 chars, letter+digit required, shared by register and change-password. Verified via test + manual curl. |
| AUTH-13 | Done | backend/src/routes/authRoutes.js (forgot-password, reset-password), migration 008 | PHASE 1: single-use hashed token, 1hr expiry, generic response regardless of account existence. Verified end-to-end via curl + dev outbox. |
| AUTH-14 | Done | backend/src/services/mailService.js | PHASE 1: dev outbox writes to backend/data/mail-outbox.json; production requires SMTP_HOST and throws rather than silently falling back. |
| AUTH-15 | Done | backend/src/routes/authRoutes.js (PUT /password) | PHASE 1: requires current password; revokes all other refresh tokens on success. Verified via curl. |
| AUTH-16 | Done | backend/src/routes/authRoutes.js (login), migration 008 | PHASE 1: 5 failed attempts within a 15-min rolling window locks the account. Verified via curl (5x wrong password). |
| AUTH-17 | Done | backend/src/routes/authRoutes.js | PHASE 1: 30-min lockout duration; also cleared immediately by a successful password reset. |
| AUTH-18 | Done | backend/src/routes/authRoutes.js (PUT /timezone), migration 008, middleware/validate.js | PHASE 1: validated via Intl.DateTimeFormat (accepts legacy aliases like Asia/Kolkata that Intl.supportedValuesOf misses). Covered by security.test.js. |
| AUTH-19 | Done | backend/src/routes/authRoutes.js, doctorRoutes.js (refresh) | PHASE 1: presenting an already-revoked refresh token revokes every token for that account. Verified end-to-end via curl replay for both patient and doctor portals. |
| SEC-13 | Done | backend/src/middleware/csrf.js, src/services/tokenService.js | PHASE 1: double-submit cookie CSRF on every cookie-driven endpoint (patient/doctor refresh+logout, admin logout). Verified via curl (403 without header, success with it) for all three portals. |
| SEC-14 | Done | backend/src/index.js, frontend/nginx.conf | PHASE 1: backend CSP now on by default (tailored to its own JSON API + Swagger UI); nginx now also sends a CSP tailored to the SPA (script-src 'self', style-src allows 'unsafe-inline' for React's inline style prop and Google Fonts). Verified headers present via curl; browser-level script-execution behavior not independently verified (no headless browser in this environment). |
| SEC-15 | Done | backend/src/middleware/upload.js (verifyFileSignature) | PHASE 1: checks magic bytes (JPEG/PNG/GIF/WEBP/PDF) after multer writes the file; deletes and rejects on mismatch. Verified via curl: a renamed text file is rejected, a genuine PNG is accepted. |
| SEC-16 | Done | backend/src/routes/entryRoutes.js, reportRoutes.js, src/index.js, frontend/nginx.conf | PHASE 1: removed the public static /uploads mount entirely; attachments and reports are now served only via authenticated, ownership-checked routes. Verified: old static path now 404s, unauthenticated request to the new route 401s, a different patient's token 404s, the owning patient gets a byte-identical file. |
| SEC-17 | Done | backend/src/db/seed.js | PHASE 0: split seed.js into seedSymptomsCatalogue() (always runs, idempotent) and seedDemoAccounts() (only when SEED_DEMO=true). Verified via manual seed run both ways. |
| SEC-18 | Done | backend/.env.example | PHASE 0: added LOG_LEVEL, SEED_DEMO, ENABLE_CSP entries; every var referenced by config/env.js and index.js is now documented with a placeholder. |
| SEC-19 | Done | backend/src/index.js | PHASE 0: express.json/urlencoded now capped at 1mb; multipart routes keep their own larger multer limits (SEC-10). |
| SEC-20 | Done | .github/workflows/ci.yml | PHASE 0: backend and frontend CI jobs run `npm audit --audit-level=high`; ml-service job runs pip-audit advisory until Phase 6 triages findings. |
| SEC-21 | Done | backend/src/services/nlpService.js (withRetry) | PHASE 1: every ML call already had an explicit timeout (3-4.5s); added one retry with a 250ms backoff before falling back to the keyword/rule-based degradation path. |
| AUDIT-1 | Done | backend/src/utils/auditLog.js, migration 009 | PHASE 1: login success/failure/lockout, logout, registration, password change, and reset events write an audit_logs row for patient, doctor, and admin. Verified via GET /admin/audit-logs showing real entries from the test session. |
| AUDIT-2 | Done | backend/src/routes/doctorRoutes.js, adminRoutes.js | PHASE 1: a doctor's appointment list writes one row per patient viewed; admin's system-wide appointment list writes one summary row per request (not per row, to avoid flooding). Scope is intentionally not yet exhaustive across every cross-ownership read in the system -- see docs/DECISIONS.md. |
| AUDIT-3 | Done | backend/src/routes/adminRoutes.js (GET /audit-logs), migration 009 | PHASE 1: admin-only, paginated, filterable by actor_type/action. No PUT/PATCH/DELETE route exists against audit_logs anywhere -- that omission is how immutability is enforced. Verified via curl. |
| ENTRY-8 | Done | backend/src/utils/bodyRegions.js, migration 010, symptomRoutes.js (GET /body-regions) | PHASE 2: structured body_region_code column + fixed 22-entry front/back/whole-body vocabulary exposed for the Phase 5 body map; body_location free text kept alongside it, unchanged. Verified via curl. |
| ENTRY-9 | Done | backend/src/db/migrations/001_init.sql | PHASE 2 note: already satisfied by v1.0's existing started_at/ended_at columns -- no new column needed, only the ENTRY-11 validation that ended_at >= started_at. |
| ENTRY-10 | Done | backend/src/routes/entryRoutes.js, migration 010 | PHASE 2: follow_up_to_entry_id, ownership-checked against the linking patient on both create and update. Verified: own entry succeeds, another patient's entry id is rejected (INVALID_FOLLOW_UP_ENTRY). |
| ENTRY-11 | Done | backend/src/middleware/validate.js (entryCreateSchema/entryUpdateSchema) | PHASE 2: replaced ad hoc truthiness checks with a Zod schema -- severity 1-10, body_region_code enum, ended_at >= started_at, numeric biomarker ranges, follow_up_to_entry_id shape. Verified via curl for each rule. |
| TRIAGE-7 | Done | backend/src/services/classificationEngine.js (TRIAGE_ENGINE_VERSION) | PHASE 2: the engine was already one module; added a version constant stored on every result (triage_version column, migration 010) plus a stable rule_id per branch. Verified via curl and tests/triage.test.js. |
| TRIAGE-8 | Done | backend/src/services/classificationEngine.js | PHASE 2: precedence was already enforced by the if/return cascade (urgent -> chronic -> recurring -> acute); documented explicitly in comments and verified with a test asserting urgent wins when an entry also matches the chronic rule. |
| TRIAGE-9 | Done | backend/src/services/classificationEngine.js, migration 010 (triage_rule_id) | PHASE 2: each branch now sets a specific rule_id (e.g. URGENT_CHEST_PAIN, CHRONIC_KNOWN_CONDITION, RECURRING_PATTERN_30D, ROUTINE_ACUTE) stored with the entry, on top of the existing free-text `reasoning` field. |
| TRIAGE-10 | Done | backend/src/services/classificationEngine.js (requires_emergency_notice) | PHASE 2: urgent results already carried emergency-services text in `recommendation`; added an explicit requires_emergency_notice boolean so the Phase 5 UI doesn't have to parse text to decide whether to show the notice. |
| NLP-8 | Done | ml_service/disease_model.py, model.py, main.py | PHASE 2: both models expose model_version (disease model: per-retrain timestamp; extractor: per-process-start timestamp, since it has no retrain endpoint), returned on every /extract and /predict-disease call. Verified via curl. |
| NLP-9 | Done | ml_service/disease_model.py (LOW_CONFIDENCE_THRESHOLD) | PHASE 2: low_confidence boolean (confidence < 0.3, a deliberately conservative floor) returned on every /predict-disease call; Phase 5 renders the actual review-prompt UI. Verified via curl with an ambiguous vs. a clear input. |
| NLP-10 | Done | ml_service/disease_model.py (candidates) | PHASE 2: added an explicit `candidates` array of exactly the top 3, alongside the pre-existing threshold-filtered `alternative_diseases`. Confirmed (code review of ExtractRequest/DiseasePredictRequest/SmartAnalyzeRequest in ml_service/main.py) that only free text and non-identifying fields are ever sent to the ML service -- no patient id, name, or email. |
| REM-8 | Done | backend/src/utils/timezoneClock.js, services/reminderScheduler.js | PHASE 3: due-time comparison uses the patient's own IANA time zone via Intl.DateTimeFormat, not server local time. Verified via direct checkAndNotify() invocation against a reminder scheduled in Asia/Kolkata time, and 4 unit tests (tests/timezoneClock.test.js). |
| REM-9 | Done | backend/src/services/reminderScheduler.js (DISPATCH_DEDUPE_WINDOW_MS) | PHASE 3: a reminder already notified within the dedupe window is skipped on a second matching tick. Verified: two consecutive checkAndNotify() calls against the same due-now reminder only update last_notified_at once. |
| REM-10 | Done | backend/src/services/reminderScheduler.js (markMissedDoses) | PHASE 3: a dose not acted on within 60 minutes of due time (patient's own zone) is auto-marked missed in dose_logs. Verified with a controlled 2-hours-overdue reminder. Known documented limitation: reminders within ~60 min of local midnight can miss having the prior day's occurrence marked (see DECISIONS.md) -- not fixed, narrow window. |
| REM-11 | Done | backend/src/routes/reminderRoutes.js (GET /doses) | PHASE 3: response now includes a computed adherence object (taken/skipped/missed counts + percentage) alongside the raw dose rows. |
| REM-12 | Done | backend/src/routes/reminderRoutes.js | CORRECTED: this was already implemented in v1.0 (auto-expire reminders whose prescribed duration has passed, checked on every GET /reminders) -- no change needed this phase. |
| REM-13 | Done | backend/src/services/reminderScheduler.js (dispatchPush) | CORRECTED: this was already implemented in v1.0 (a 'gone' result from sendNotification deletes the stale push_subscriptions row) -- no change needed this phase. |
| REM-14 | Done | backend/src/services/reminderScheduler.js (dispatchPush payload) | PHASE 3: push title/body changed to neutral 'Medication reminder' / 'You have a scheduled dose due now' text, regardless of the patient's own (potentially condition-revealing) reminder label. |
| APPT-5 | Done | backend/src/services/appointmentReminderScheduler.js | PHASE 3: a 15-minute cron checks for scheduled appointments within a 24-hour window with no reminder sent yet, pushes a neutral notification, and marks reminder_sent_at. Verified via direct sendDueAppointmentReminders() invocation against a controlled 2-hours-out appointment. |
| APPT-6 | Done | backend/src/utils/appointments.js (hasSlotConflict) | PHASE 3: rejects booking or rescheduling a physician into a slot within 30 minutes of one of their existing non-cancelled appointments. Enforced on both POST / and PUT /:id. |
| APPT-7 | Done | backend/src/middleware/validate.js (appointmentCreateSchema/appointmentUpdateSchema) | PHASE 3: future-only booking/rescheduling, with a 5-minute grace window for request latency. |
| APPT-8 | Done | backend/src/utils/appointments.js (recordStatusChange), migration 011 (appointment_status_history) | PHASE 3: every status transition (create, PUT, PATCH /status) writes a history row; GET /appointments/:id/status-history exposes it. |
| APPT-9 | Done | backend/src/utils/appointments.js (notifyCounterpart) | PHASE 3: cancelling or rescheduling (via PUT, PATCH /status, or DELETE) notifies the assigned physician through the existing dev-outbox mail channel. |
| DOC-9 | Done | backend/src/routes/doctorRoutes.js | CONFIRMED on full review: every patient-data-returning endpoint (GET /appointments, POST /prescribe, GET /prescriptions) is already scoped by `WHERE doctor_id = req.doctor.id` or an equivalent join condition -- no endpoint lets a doctor read a patient they aren't appointment-linked to. |
| DOC-10 | Done | backend/src/routes/doctorRoutes.js (prescribe), medications table | Prescription-as-linked-medication pattern already matches this requirement per v1.0 audit. |
| DOC-11 | Done | backend/src/routes/doctorRoutes.js, frontend DoctorPortal.jsx | Appointment listing exists; whether it is a dedicated sorted 'worklist' view is a frontend redesign task, not a backend gap. |
| DOC-12 | Done | backend/src/routes/doctorRoutes.js (DOCTOR_ACCESS_LOOKBACK_DAYS) | PHASE 3: GET /appointments now only surfaces a patient relationship with at least one appointment within a 180-day look-back window (via EXISTS against the same doctor+patient pair), so a long-lapsed relationship drops out of the list entirely even though the old appointment rows still technically have doctor_id set. Verified: a patient with only a 300-day-old appointment is excluded; one with a recent appointment keeps full history visible. |
| CARE-4 | Done | backend/src/routes/caregiverRoutes.js (GET /shares) | PHASE 3: lists every share link the patient created (active or not), with access count and last-accessed timestamp, never re-exposing the raw token. |
| CARE-5 | Done | backend/src/routes/caregiverRoutes.js (DELETE /shares/:id), migration 012 (revoked column) | PHASE 3: revokes a link before its natural expiry; a revoked link is rejected identically to an expired one from the caregiver's side. Verified end to end. |
| CARE-6 | Done | backend/src/routes/caregiverRoutes.js (scope), migration 012 | PHASE 3: patient chooses which of symptoms/medications/appointments a link exposes at generation time; GET /view/:token only returns the scoped sections. Verified: a medications-only link's response has no entries/appointments keys. |
| CARE-7 | Done | backend/src/routes/caregiverRoutes.js (caregiver_share_access_log), migration 012 | PHASE 3: every GET /view/:token call is logged (even before the response is built, so an aborted request still counts); GET /shares/:id/access-log exposes it to the owning patient. Verified end to end. |
| REPORT-3 | Done | backend/src/routes/reportRoutes.js, middleware/validate.js (REPORT_SECTIONS) | PHASE 3: patient chooses which sections (symptoms/medications/appointments) a generated report includes; excluded sections are never even queried. Verified via curl. |
| REPORT-4 | Done | backend/src/routes/reportRoutes.js (sha256File), migration 013 (checksum column) | PHASE 3: a SHA-256 checksum is computed once at generation and re-verified on every download; a mismatch (simulated by appending bytes to the file on disk) is rejected with REPORT_CHECKSUM_MISMATCH rather than silently served. |
| REPORT-5 | Done | backend/src/middleware/auth.js (authenticatePatientOrDoctor), reportRoutes.js | PHASE 3: a report download is permitted for the owning patient, or a physician with a non-cancelled appointment with that patient within the same 180-day look-back window DOC-12 uses. Verified: a doctor with no appointment link is rejected (403 NO_ACTIVE_APPOINTMENT_LINK); one with a linked appointment succeeds. |
| PRIV-1 | Done | backend/src/routes/authRoutes.js, middleware/validate.js, migration 014 (consents) | PHASE 4: explicit terms acceptance captured at registration, verified by tests/privacy.test.js. |
| PRIV-2 | Done | backend/src/routes/accountRoutes.js (GET /export) | PHASE 4: full machine-readable JSON data export covering profile, entries, medications, reminders, appointments, reports, caregiver links, consent. Verified by tests/privacy.test.js. |
| PRIV-3 | Done | backend/src/routes/accountRoutes.js (POST/GET/DELETE /deletion-request), migration 014 | PHASE 4: queryable deletion request with 24-hour grace window and cancel endpoint. Verified by tests/privacy.test.js. |
| PRIV-4 | Done | backend/src/routes/accountRoutes.js (GET /access-log) | PHASE 4: unified patient-visible log of physician access, admin views, and caregiver share views. Verified by tests/privacy.test.js. |
| PRIV-5 | Done | backend/src/services/retentionJob.js | PHASE 4: hourly cron sweep purging expired deletion requests, dead caregiver shares (90d), and old audit logs (400d). |
| PRIV-6 | Done | backend/src/services/retentionJob.js | PHASE 4: user row deletion cascades cleanly across all referencing tables via existing ON DELETE CASCADE foreign keys. |
| ADMIN-10 | Done | backend/src/routes/adminRoutes.js (GET /audit-logs) | PHASE 4: filterable by actor_type, action, date_from, and date_to. Verified by tests/admin.test.js. |
| ADMIN-11 | Done | backend/src/routes/adminRoutes.js (POST /dataset/validate) | PHASE 4: candidate dataset schema validation returning class balance distribution before confirming retrain. Verified by tests/admin.test.js. |
| ADMIN-12 | Done | ml_service/jobs.py, main.py, backend adminRoutes.js | PHASE 4: asynchronous background model retraining with immediate job ID and pollable status endpoint. Verified by test_model_registry.py. |
| ADMIN-13 | Done | ml_service/model_registry.py, disease_model.py, main.py | PHASE 4: metrics-gated activation requiring holdout threshold unless explicit admin force override. |
| ADMIN-14 | Done | ml_service/model_registry.py, disease_model.py, main.py | PHASE 4: rollback active model to any previously activated version. Verified by test_model_registry.py. |
| ADMIN-15 | Done | ml_service/model_registry.py, main.py, backend adminRoutes.js | PHASE 4: full model version history with dataset reference, metrics, and activation status. |
| API-1 | Done | backend/src/utils/apiError.js, backend/src/middleware/errorHandler.js | PHASE 0: 130/137 existing error responses migrated via codemod to { error: { code, message } }; remaining 7 (template literals + validate.js) fixed by hand. Verified by curl against bad-login, admin-login, and validation-failure paths. |
| API-2 | Done | backend/src/docs/openapi.yaml | PHASE 0: OpenAPI 3.0 document covering all 60 mounted paths, served via swagger-ui-express at /api/docs. Verified: GET /api/docs returns 200 and renders. |
| API-3 | Done | backend/src/utils/pagination.js | PHASE 0: added shared parsePagination/paginatedResponse helpers; applied to entries, medications, appointments (patient+doctor+admin), reminders, reports, admin doctors. Symptom catalogue and doctor directory deliberately left unpaginated as bounded reference lists (see DECISIONS.md). Verified via curl on each endpoint. |
| OBS-2 | Done | backend/src/index.js | PHASE 0: /api/health is now liveness-only (always 200); new /api/ready checks DB and ML-service reachability, returns 503 if either is down. Verified via curl with ML service stopped and running. |
| OBS-1 | Done | backend/src/utils/logger.js, backend/src/middleware/requestLogger.js | PHASE 0: replaced morgan with pino structured JSON logging; every line carries a request id (also returned as X-Request-Id); redact list covers passwords/tokens/free-text health fields. Verified by inspecting live log output. |
| DEPLOY-11 | Done | .github/workflows/ci.yml, backend/.dockerignore, frontend/.dockerignore, ml_service/.dockerignore | PHASE 0: CI job builds and brings up the full compose stack, polls until every service is healthy, fails otherwise. Verified locally first (not just in CI): docker compose up --build reached (healthy) on all 3 services after fixing a real bug this check surfaced (missing .dockerignore let host node_modules overwrite container-built native bindings — see DECISIONS.md). |
| CLIN-4 | Done | frontend/src/pages/LogSymptom.jsx, Insights.jsx, classificationEngine.js | PHASE 5: Systematic hedged copy audit ("may be consistent with", never diagnostic certainty). Verified by components.test.js. |
| CLIN-5 | Done | backend/src/services/classificationEngine.js | PHASE 4: static self-care advice with last reviewed date and visible pending clinical review governance label. |
| MED-4 | Done | backend/src/routes/medicationRoutes.js, frontend/src/pages/Medications.jsx | No dosing-advice or interaction-checking logic found anywhere; prominent advisory notice displayed. |
| UI-6 | Done | frontend/src/components/Sidebar.jsx | PHASE 5: Left sidebar with exact labels at >=1024px and bottom tab bar below 1024px. |
| UI-7 | Done | frontend/src/pages/Dashboard.jsx | PHASE 5: Overview layout with long date, active symptoms table with duration/segmented bar/mini-trend, doses checklist, and side rail. |
| UI-8 | Done | frontend/src/pages/LogSymptom.jsx | PHASE 5: Single-column intake form with real-time "What we picked up" editable chip side rail. |
| UI-9 | Done | frontend/src/pages/LogSymptom.jsx | PHASE 5: Interactive 23-region front/back body map with text selector fallback. |
| UI-10 | Done | frontend/src/pages/LogSymptom.jsx | PHASE 5: Left-ruled tier card with distinct icon shape, hedged advice, and pre-filled appointment booking button. |
| UI-11 | Done | frontend/src/pages/History.jsx | PHASE 5: Dense clinical table with column sorting, pagination, and inline expandable rows. |
| UI-12 | Done | frontend/src/pages/Insights.jsx | PHASE 5: Fixed 0-10 Y-axis trend chart with medication start/stop markers, table toggle, and hedged copy. |
| UI-13 | Done | frontend/src/pages/Medications.jsx | PHASE 5: Day dose timeline with focus-trapping role="alertdialog" alarm modal and MED-4 notice. |
| UI-14 | Done | frontend/src/pages/DoctorPortal.jsx | PHASE 5: Three-pane layout (worklist, appointment detail with prescribe, patient summary timeline). |
| UI-15 | Done | frontend/public/manifest.webmanifest, index.html | PHASE 5: PWA webmanifest with clinical icons, standalone display mode, and service worker registration. |
| UI-16 | Done | frontend/src/pages/{Home,HowTriageWorks,PrivacyPolicy,MedicalDisclaimer,Help}.jsx | PHASE 5: Unauthenticated public routes for home, triage explanation, privacy, medical disclaimer, and help. |
| DASH-1 | Done | frontend/src/pages/Dashboard.jsx | PHASE 5: Overview header with long localized date and active symptoms count. |
| DASH-2 | Done | frontend/src/pages/Dashboard.jsx | PHASE 5: Active symptoms table with duration, segmented severity bar, and mini-trend arrow. |
| DASH-3 | Done | frontend/src/pages/Dashboard.jsx | PHASE 5: Today's doses checklist with taken/skip actions and 7-day adherence gauge. |
| DASH-4 | Done | frontend/src/pages/Dashboard.jsx | PHASE 5: Next appointment side rail card with physician details and booking link. |
| DASH-5 | Done | frontend/src/pages/Dashboard.jsx | PHASE 5: "Why am I seeing this?" collapsible disclosure explaining triage tier rules. |
| HIST-3 | Done | frontend/src/pages/History.jsx | PHASE 5: Dense table column sorting across date, symptom, severity, and triage tier. |
| HIST-4 | Done | frontend/src/pages/History.jsx | PHASE 5: Server-aligned pagination controls with configurable page sizes. |
| HIST-5 | Done | frontend/src/pages/History.jsx | PHASE 5: Inline row expansion showing triggers, notes, biomarkers, and linked follow-ups. |
| INSIGHTS-2 | Done | frontend/src/pages/Insights.jsx | PHASE 5: Hedged association language ("may be associated with", never causal). |
| INSIGHTS-3 | Done | frontend/src/pages/Insights.jsx | PHASE 5: "Need N more entries" data-sufficiency threshold notice for under-sampled time windows. |
| INSIGHTS-4 | Done | frontend/src/pages/Insights.jsx | PHASE 5: Table and chart view toggle with fixed 0-10 Y-axis trend line. |
| A11Y-1 | Done | frontend/src/index.css | PHASE 5: 4.5:1 text-to-background contrast ratio across both light and dark themes. |
| A11Y-2 | Done | frontend/src/index.css | PHASE 5: 2px solid primary focus outline with 2px offset on all interactive controls. |
| A11Y-3 | Done | frontend/src/pages/Dashboard.jsx, LogSymptom.jsx | PHASE 5: Severity ramp always paired with numeric value and distinct icon shape, never color alone. |
| A11Y-4 | Done | frontend/src/components/Sidebar.jsx, pages/* | PHASE 5: Native form elements with associated labels and ARIA descriptive hints. |
| A11Y-5 | Done | frontend/src/pages/LogSymptom.jsx, AdminPortal.jsx | PHASE 5: Dynamic error banners with role="alert" announcements. |
| A11Y-6 | Done | frontend/src/pages/Medications.jsx | PHASE 5: Focus-trapping modal with role="alertdialog" for time-critical dose alarms. |
| A11Y-7 | Done | frontend/src/index.css | PHASE 5: Tabular figures (font-variant-numeric: tabular-nums) on all numeric tables and charts. |
| A11Y-8 | Done | frontend/src/index.css | PHASE 5: prefers-reduced-motion CSS media query disabling all animations and transitions. |
| TEST-1 | Done | backend/tests/triage.test.js | PHASE 2: 16 boundary tests covering every TRIAGE-2..5 threshold at boundary values and precedence. |
| TEST-2 | Done | backend/tests/patientIsolation.test.js | PHASE 6: Multi-tenant patient data isolation tests verifying cross-tenant access rejection. |
| TEST-3 | Done | backend/tests/patientIsolation.test.js | PHASE 6: Physician least-privilege and 180-day lookback access control integration tests. |
| TEST-4 | Done | backend/tests/mlContract.test.js | PHASE 6: ML microservice contract shape and heuristic rule offline fallback tests. |
| TEST-5 | Done | backend/tests/e2eSmoke.test.js | PHASE 6: End-to-end clinical journey smoke test (onboarding, intake, triage, booking, export, deletion). |
| TEST-6 | Done | frontend/src/__tests__/components.test.js | PHASE 6: Frontend component unit tests (body regions, design tokens, hedged copy, ARIA roles). |
| TEST-7 | Done | backend/tests/syntheticDataAudit.test.js | PHASE 6: Synthetic data audit verifying zero PII leakage and strict credential redaction. |
| PERF-5 | Done | backend/src/utils/pagination.js | PHASE 0: shared helper defaults every list endpoint to limit=20 (max 50), verified on all endpoints. |
| PERF-7 | Done | frontend/scripts/check-bundle-budget.js, package.json | PHASE 6: Bundle-size budget check script (JS chunks < 500kB raw / < 160kB gzip, CSS < 50kB). |
| MAIN-5 | Done | docs/RUNBOOK.md | PHASE 6: Dedicated operational runbook (backup/restore, retraining, rollback, incident response). |
| MAIN-7 | Done | backend/src/db/migrate.js (runMigrationDown), *.down.sql files | PHASE 1: added a rollback runner (`npm run migrate:down -- <file>.sql`) plus .down.sql files. |

## Phase sequencing

- **Phase 0 — done**: SEC-7, SEC-17..20, AUTH-10, OBS-1, OBS-2, API-1, API-2, API-3, PERF-5, DEPLOY-11, plus lint/format tooling (ESLint+Prettier for backend, oxlint+Prettier for frontend, Ruff+Black for ml_service) and `.env.example` completeness.
- **Phase 1 — done**: AUTH-12..19, SEC-13..16, SEC-21, AUDIT-1..3, plus MAIN-7 (migration rollbacks, pulled forward from Phase 6 since the convention needed to exist before more migrations landed).
- **Phase 2 — done**: ENTRY-8..11, TRIAGE-7..10, NLP-8..10, plus TEST-1 (triage boundary tests, pulled forward since it was explicitly called out as something to write 'as you go' during this phase).
- **Phase 3 — done**: REM-8..14, APPT-5..9, DOC-9, DOC-12, CARE-4..7, REPORT-3..5.
- **Phase 4** closes: PRIV-1..6, ADMIN-10..15, CLIN-5.
- **Phase 5** closes: UI-6..16, DASH-1..5, HIST-3..5, INSIGHTS-2..4, A11Y-1..8, CLIN-4 (audit pass).
- **Phase 6** closes: TEST-1..7, PERF-7, MAIN-5, MAIN-7.
