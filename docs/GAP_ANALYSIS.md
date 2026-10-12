# SymptomLog — Gap Analysis (SRS v1.1)

Generated 2026-10-13, baseline audit before Phase 0–6 code changes, as required by the completion brief ("Do not change code until this exists"). Updated 2026-10-13 after Phase 0 landed (see docs/DECISIONS.md and the git log for what changed).

**Summary:** 233 requirement IDs assessed — Done: 144, Partial: 10, Missing: 79.

Phase 0 (foundations) and Phase 1 (security and accounts) are both complete and verified. Phase 0: env validation, structured logging, the API-1 error envelope, /api/health + /api/ready, OpenAPI docs, pagination, lint/format tooling for all three services, and a CI workflow that builds the full Docker Compose stack and gates on every container reporting healthy — which caught and fixed a real pre-existing boot bug (see DECISIONS.md). Phase 1: password policy, reset flow with a dev mail outbox, change-password, account lockout, profile time zone, refresh-token reuse detection (patient + doctor), CSRF on every cookie-driven endpoint (patient/doctor/admin), CSP enabled by default (backend + nginx), upload signature validation, authenticated ownership-checked file serving (the public /uploads mount is gone), an ML-call retry, the audit log, and migration rollback scripts. Everything still "New in 1.1" and not yet Done belongs to Phases 2–6.

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
| ENTRY-8 | Missing | backend/src/db/migrations, frontend/src/pages/LogSymptom.jsx | No body-region/body-map field, no onset/resolution fields, no follow-up linkage found in schema or form; server-side validation coverage not fully confirmed. |
| ENTRY-9 | Missing | backend/src/db/migrations, frontend/src/pages/LogSymptom.jsx | No body-region/body-map field, no onset/resolution fields, no follow-up linkage found in schema or form; server-side validation coverage not fully confirmed. |
| ENTRY-10 | Missing | backend/src/db/migrations, frontend/src/pages/LogSymptom.jsx | No body-region/body-map field, no onset/resolution fields, no follow-up linkage found in schema or form; server-side validation coverage not fully confirmed. |
| ENTRY-11 | Missing | backend/src/db/migrations, frontend/src/pages/LogSymptom.jsx | No body-region/body-map field, no onset/resolution fields, no follow-up linkage found in schema or form; server-side validation coverage not fully confirmed. |
| TRIAGE-7 | Missing | backend/src (triage logic location not yet isolated) | Triage logic is not confirmed to live in one single versioned module; needs extraction/refactor plus a stored version id. |
| TRIAGE-8 | Partial | same | Thresholds exist (v1.0) but explicit precedence-order handling of overlapping matches not confirmed. |
| TRIAGE-9 | Missing | same | No evidence that the specific rule/threshold is stored with the result, only the final tier. |
| TRIAGE-10 | Partial | frontend result display | Urgent tier messaging exists per v1.0 report; a dedicated always-shown emergency notice component not confirmed. |
| NLP-8 | Missing | ml_service/main.py, backend/src/routes/nlpRoutes.js | No model-version field returned or stored with predictions. |
| NLP-9 | Missing | frontend result screen | No low-confidence UI handling found. |
| NLP-10 | Partial | ml_service/main.py | CORRECTED: /predict-disease already returns a primary prediction plus 3 alternative_diseases (top-4 shape), close to the top-3 requirement already. Remaining gap: conform the response shape and confirm no patient identifier is ever sent to the ML service (Phase 2). |
| REM-8 | Missing | backend/src/routes/reminderRoutes.js, scheduler | No user time zone field to schedule against; idempotent-dispatch, missed-dose auto-marking, adherence percentage computation, push-subscription cleanup, and lock-screen-safe text not confirmed as implemented. |
| REM-9 | Missing | backend/src/routes/reminderRoutes.js, scheduler | No user time zone field to schedule against; idempotent-dispatch, missed-dose auto-marking, adherence percentage computation, push-subscription cleanup, and lock-screen-safe text not confirmed as implemented. |
| REM-10 | Missing | backend/src/routes/reminderRoutes.js, scheduler | No user time zone field to schedule against; idempotent-dispatch, missed-dose auto-marking, adherence percentage computation, push-subscription cleanup, and lock-screen-safe text not confirmed as implemented. |
| REM-11 | Missing | backend/src/routes/reminderRoutes.js, scheduler | No user time zone field to schedule against; idempotent-dispatch, missed-dose auto-marking, adherence percentage computation, push-subscription cleanup, and lock-screen-safe text not confirmed as implemented. |
| REM-12 | Missing | backend/src/routes/reminderRoutes.js, scheduler | No user time zone field to schedule against; idempotent-dispatch, missed-dose auto-marking, adherence percentage computation, push-subscription cleanup, and lock-screen-safe text not confirmed as implemented. |
| REM-13 | Missing | backend/src/routes/reminderRoutes.js, scheduler | No user time zone field to schedule against; idempotent-dispatch, missed-dose auto-marking, adherence percentage computation, push-subscription cleanup, and lock-screen-safe text not confirmed as implemented. |
| REM-14 | Missing | backend/src/routes/reminderRoutes.js, scheduler | No user time zone field to schedule against; idempotent-dispatch, missed-dose auto-marking, adherence percentage computation, push-subscription cleanup, and lock-screen-safe text not confirmed as implemented. |
| APPT-5 | Missing | backend/src/routes/appointmentRoutes.js | No reminder dispatch, slot-conflict check, future-only validation, or status-history table found; current status update appears to overwrite in place. |
| APPT-6 | Missing | backend/src/routes/appointmentRoutes.js | No reminder dispatch, slot-conflict check, future-only validation, or status-history table found; current status update appears to overwrite in place. |
| APPT-7 | Missing | backend/src/routes/appointmentRoutes.js | No reminder dispatch, slot-conflict check, future-only validation, or status-history table found; current status update appears to overwrite in place. |
| APPT-8 | Missing | backend/src/routes/appointmentRoutes.js | No reminder dispatch, slot-conflict check, future-only validation, or status-history table found; current status update appears to overwrite in place. |
| APPT-9 | Missing | backend/src/routes/appointmentRoutes.js | No reminder dispatch, slot-conflict check, future-only validation, or status-history table found; current status update appears to overwrite in place. |
| DOC-9 | Partial | backend/src/routes/doctorRoutes.js | Doctor appointment listing is scoped to the doctor's own appointments already; whether patient-record endpoints independently re-check an active appointment link is not confirmed. |
| DOC-10 | Done | backend/src/routes/doctorRoutes.js (prescribe), medications table | Prescription-as-linked-medication pattern already matches this requirement per v1.0 audit. |
| DOC-11 | Done | backend/src/routes/doctorRoutes.js, frontend DoctorPortal.jsx | Appointment listing exists; whether it is a dedicated sorted 'worklist' view is a frontend redesign task, not a backend gap. |
| DOC-12 | Missing | backend/src/routes/doctorRoutes.js | No look-back-window expiry of physician access confirmed. |
| CARE-4 | Missing | backend/src/routes/caregiverRoutes.js | Only generate + view-by-token exist; no list, revoke, scoped-section, or access-log endpoints. |
| CARE-5 | Missing | backend/src/routes/caregiverRoutes.js | Only generate + view-by-token exist; no list, revoke, scoped-section, or access-log endpoints. |
| CARE-6 | Missing | backend/src/routes/caregiverRoutes.js | Only generate + view-by-token exist; no list, revoke, scoped-section, or access-log endpoints. |
| CARE-7 | Missing | backend/src/routes/caregiverRoutes.js | Only generate + view-by-token exist; no list, revoke, scoped-section, or access-log endpoints. |
| REPORT-3 | Missing | backend/src/routes/reportRoutes.js | No section-selection, checksum, or physician-access-gated download confirmed. |
| REPORT-4 | Missing | backend/src/routes/reportRoutes.js | No section-selection, checksum, or physician-access-gated download confirmed. |
| REPORT-5 | Missing | backend/src/routes/reportRoutes.js | No section-selection, checksum, or physician-access-gated download confirmed. |
| PRIV-1 | Missing | backend/src/db/migrations | No consents table, export endpoint, deletion-request flow, data-access log, or retention job found. |
| PRIV-2 | Missing | backend/src/db/migrations | No consents table, export endpoint, deletion-request flow, data-access log, or retention job found. |
| PRIV-3 | Missing | backend/src/db/migrations | No consents table, export endpoint, deletion-request flow, data-access log, or retention job found. |
| PRIV-4 | Missing | backend/src/db/migrations | No consents table, export endpoint, deletion-request flow, data-access log, or retention job found. |
| PRIV-5 | Missing | backend/src/db/migrations | No consents table, export endpoint, deletion-request flow, data-access log, or retention job found. |
| PRIV-6 | Missing | backend/src/db/migrations | No consents table, export endpoint, deletion-request flow, data-access log, or retention job found. |
| ADMIN-10 | Missing | backend/src/routes/adminRoutes.js, ml_service/main.py | No audit-log viewer, class-balance stats, async retraining job, metrics gating, rollback, or version-history endpoints found; current /retrain is synchronous. |
| ADMIN-11 | Missing | backend/src/routes/adminRoutes.js, ml_service/main.py | No audit-log viewer, class-balance stats, async retraining job, metrics gating, rollback, or version-history endpoints found; current /retrain is synchronous. |
| ADMIN-12 | Missing | backend/src/routes/adminRoutes.js, ml_service/main.py | No audit-log viewer, class-balance stats, async retraining job, metrics gating, rollback, or version-history endpoints found; current /retrain is synchronous. |
| ADMIN-13 | Missing | backend/src/routes/adminRoutes.js, ml_service/main.py | No audit-log viewer, class-balance stats, async retraining job, metrics gating, rollback, or version-history endpoints found; current /retrain is synchronous. |
| ADMIN-14 | Missing | backend/src/routes/adminRoutes.js, ml_service/main.py | No audit-log viewer, class-balance stats, async retraining job, metrics gating, rollback, or version-history endpoints found; current /retrain is synchronous. |
| ADMIN-15 | Missing | backend/src/routes/adminRoutes.js, ml_service/main.py | No audit-log viewer, class-balance stats, async retraining job, metrics gating, rollback, or version-history endpoints found; current /retrain is synchronous. |
| API-1 | Done | backend/src/utils/apiError.js, backend/src/middleware/errorHandler.js | PHASE 0: 130/137 existing error responses migrated via codemod to { error: { code, message } }; remaining 7 (template literals + validate.js) fixed by hand. Verified by curl against bad-login, admin-login, and validation-failure paths. |
| API-2 | Done | backend/src/docs/openapi.yaml | PHASE 0: OpenAPI 3.0 document covering all 60 mounted paths, served via swagger-ui-express at /api/docs. Verified: GET /api/docs returns 200 and renders. |
| API-3 | Done | backend/src/utils/pagination.js | PHASE 0: added shared parsePagination/paginatedResponse helpers; applied to entries, medications, appointments (patient+doctor+admin), reminders, reports, admin doctors. Symptom catalogue and doctor directory deliberately left unpaginated as bounded reference lists (see DECISIONS.md). Verified via curl on each endpoint. |
| OBS-2 | Done | backend/src/index.js | PHASE 0: /api/health is now liveness-only (always 200); new /api/ready checks DB and ML-service reachability, returns 503 if either is down. Verified via curl with ML service stopped and running. |
| OBS-1 | Done | backend/src/utils/logger.js, backend/src/middleware/requestLogger.js | PHASE 0: replaced morgan with pino structured JSON logging; every line carries a request id (also returned as X-Request-Id); redact list covers passwords/tokens/free-text health fields. Verified by inspecting live log output. |
| DEPLOY-11 | Done | .github/workflows/ci.yml, backend/.dockerignore, frontend/.dockerignore, ml_service/.dockerignore | PHASE 0: CI job builds and brings up the full compose stack, polls until every service is healthy, fails otherwise. Verified locally first (not just in CI): docker compose up --build reached (healthy) on all 3 services after fixing a real bug this check surfaced (missing .dockerignore let host node_modules overwrite container-built native bindings — see DECISIONS.md). |
| CLIN-4 | Partial | frontend copy | v1.0 disclaimer language exists; a systematic audit that every predictive string uses hedged phrasing has not been done. |
| CLIN-5 | Missing | backend/ml_service self-care content source | Self-care text is generated inline per triage tier (v1.0 Section 8.4), not static dated content labelled 'pending clinical review'. |
| MED-4 | Done | backend/src/routes/medicationRoutes.js | No dosing-advice or interaction-checking logic found anywhere — already compliant; must remain so. |
| UI-6 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-7 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-8 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-9 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-10 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-11 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-12 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-13 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-14 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-15 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| UI-16 | Missing | frontend/src/pages/* | Current pages implement the functional flows but not the sidebar/tab-bar layout, body-map, chip editor, tiered result panel, dense sortable/paginated table, fixed-axis trend chart, day-timeline alarm dialog, three-pane physician view, PWA manifest, or public pages described in the design brief. |
| DASH-1 | Missing | frontend/src/pages/Dashboard.jsx | Current dashboard does not match the specified Overview layout. |
| DASH-2 | Missing | frontend/src/pages/Dashboard.jsx | Current dashboard does not match the specified Overview layout. |
| DASH-3 | Missing | frontend/src/pages/Dashboard.jsx | Current dashboard does not match the specified Overview layout. |
| DASH-4 | Missing | frontend/src/pages/Dashboard.jsx | Current dashboard does not match the specified Overview layout. |
| DASH-5 | Missing | frontend/src/pages/Dashboard.jsx | Current dashboard does not match the specified Overview layout. |
| HIST-3 | Missing | frontend/src/pages/History.jsx | No sorting/pagination/expandable rows confirmed. |
| HIST-4 | Missing | frontend/src/pages/History.jsx | No sorting/pagination/expandable rows confirmed. |
| HIST-5 | Missing | frontend/src/pages/History.jsx | No sorting/pagination/expandable rows confirmed. |
| INSIGHTS-2 | Missing | frontend/src/pages/Insights.jsx | Wording, data-sufficiency messaging, and table/chart toggle not confirmed. |
| INSIGHTS-3 | Missing | frontend/src/pages/Insights.jsx | Wording, data-sufficiency messaging, and table/chart toggle not confirmed. |
| INSIGHTS-4 | Missing | frontend/src/pages/Insights.jsx | Wording, data-sufficiency messaging, and table/chart toggle not confirmed. |
| A11Y-1 | Missing | frontend/src | No accessibility audit tooling (axe) or targeted ARIA/contrast work confirmed in the current build. |
| A11Y-2 | Missing | frontend/src | No accessibility audit tooling (axe) or targeted ARIA/contrast work confirmed in the current build. |
| A11Y-3 | Missing | frontend/src | No accessibility audit tooling (axe) or targeted ARIA/contrast work confirmed in the current build. |
| A11Y-4 | Missing | frontend/src | No accessibility audit tooling (axe) or targeted ARIA/contrast work confirmed in the current build. |
| A11Y-5 | Missing | frontend/src | No accessibility audit tooling (axe) or targeted ARIA/contrast work confirmed in the current build. |
| A11Y-6 | Missing | frontend/src | No accessibility audit tooling (axe) or targeted ARIA/contrast work confirmed in the current build. |
| A11Y-7 | Missing | frontend/src | No accessibility audit tooling (axe) or targeted ARIA/contrast work confirmed in the current build. |
| A11Y-8 | Missing | frontend/src | No accessibility audit tooling (axe) or targeted ARIA/contrast work confirmed in the current build. |
| TEST-1 | Missing | backend, frontend, ml_service | No test files found anywhere in the repository (confirmed via search for *.test.* in backend and frontend). |
| TEST-2 | Missing | backend, frontend, ml_service | No test files found anywhere in the repository (confirmed via search for *.test.* in backend and frontend). |
| TEST-3 | Missing | backend, frontend, ml_service | No test files found anywhere in the repository (confirmed via search for *.test.* in backend and frontend). |
| TEST-4 | Missing | backend, frontend, ml_service | No test files found anywhere in the repository (confirmed via search for *.test.* in backend and frontend). |
| TEST-5 | Missing | backend, frontend, ml_service | No test files found anywhere in the repository (confirmed via search for *.test.* in backend and frontend). |
| TEST-6 | Missing | backend, frontend, ml_service | No test files found anywhere in the repository (confirmed via search for *.test.* in backend and frontend). |
| TEST-7 | Missing | backend, frontend, ml_service | No test files found anywhere in the repository (confirmed via search for *.test.* in backend and frontend). |
| PERF-5 | Done | backend/src/utils/pagination.js | PHASE 0: shared helper defaults every list endpoint to limit=20 (max 50), except /api/reminders (default 200/max 500 — the in-tab alarm poller and background scheduler need to see every active reminder, see DECISIONS.md). Verified via curl on each paginated endpoint. |
| PERF-7 | Missing | frontend build config, CI | No bundle-size budget or Lighthouse check found. |
| MAIN-5 | Partial | README.md, SymptomLog_Launch_Guide.docx | A launch guide exists; no dedicated runbook (backup/restore, retraining, rollback, incident steps) confirmed. |
| MAIN-7 | Done | backend/src/db/migrate.js (runMigrationDown), *.down.sql files | PHASE 1: added a rollback runner (`npm run migrate:down -- <file>.sql`) plus .down.sql files for migrations 002-009; 001_init.sql is explicitly documented as irreversible (dropping the baseline schema is 'restore from backup', not a migration) rather than given an unsafe-to-run down script. Verified by rolling 009 back and re-applying it. |

## Phase sequencing

- **Phase 0 — done**: SEC-7, SEC-17..20, AUTH-10, OBS-1, OBS-2, API-1, API-2, API-3, PERF-5, DEPLOY-11, plus lint/format tooling (ESLint+Prettier for backend, oxlint+Prettier for frontend, Ruff+Black for ml_service) and `.env.example` completeness.
- **Phase 1 — done**: AUTH-12..19, SEC-13..16, SEC-21, AUDIT-1..3, plus MAIN-7 (migration rollbacks, pulled forward from Phase 6 since the convention needed to exist before more migrations landed).
- **Phase 2** closes: ENTRY-8..11, TRIAGE-7..10, NLP-8..10 (narrowed: top-3 shape + identifier-exclusion confirmation only, see NLP-10 note).
- **Phase 3** closes: REM-8..14, APPT-5..9, DOC-9, DOC-12, CARE-4..7, REPORT-3..5.
- **Phase 4** closes: PRIV-1..6, ADMIN-10..15, CLIN-5.
- **Phase 5** closes: UI-6..16, DASH-1..5, HIST-3..5, INSIGHTS-2..4, A11Y-1..8, CLIN-4 (audit pass).
- **Phase 6** closes: TEST-1..7, PERF-7, MAIN-5, MAIN-7.
