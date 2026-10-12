# SymptomLog — Gap Analysis (SRS v1.1)

Generated 2026-10-13, prior to any Phase 0–6 code changes, as required by the completion brief ("Do not change code until this exists").

**Summary:** 233 requirement IDs assessed — Done: 114, Partial: 17, Missing: 102.

Most "New in 1.1" IDs (Section 10 of the SRS) are Missing, as anticipated by the brief. Carried-forward v1.0 IDs are mostly Done, with a handful of Partial findings (CSP default-off, upload limits not universal, some validation coverage unconfirmed) that are folded into the matching v1.1 security requirement rather than tracked twice.

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
| AUTH-10 | Partial | backend/src/index.js | JWT_SECRET is required in .env.example but no verified startup assertion that the server refuses to boot on a missing/weak secret — needs an explicit check. |
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
| SEC-7 | Partial | backend/src/index.js | See AUTH-10 — needs an explicit startup assertion, not just documentation in .env.example. |
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
| AUTH-12 | Missing | backend/src/routes/authRoutes.js | No password policy enforcement, no reset flow/outbox, no change-password endpoint, no lock-out, no profile time zone, no refresh-reuse detection found. |
| AUTH-13 | Missing | backend/src/routes/authRoutes.js | No password policy enforcement, no reset flow/outbox, no change-password endpoint, no lock-out, no profile time zone, no refresh-reuse detection found. |
| AUTH-14 | Missing | backend/src/routes/authRoutes.js | No password policy enforcement, no reset flow/outbox, no change-password endpoint, no lock-out, no profile time zone, no refresh-reuse detection found. |
| AUTH-15 | Missing | backend/src/routes/authRoutes.js | No password policy enforcement, no reset flow/outbox, no change-password endpoint, no lock-out, no profile time zone, no refresh-reuse detection found. |
| AUTH-16 | Missing | backend/src/routes/authRoutes.js | No password policy enforcement, no reset flow/outbox, no change-password endpoint, no lock-out, no profile time zone, no refresh-reuse detection found. |
| AUTH-17 | Missing | backend/src/routes/authRoutes.js | No password policy enforcement, no reset flow/outbox, no change-password endpoint, no lock-out, no profile time zone, no refresh-reuse detection found. |
| AUTH-18 | Missing | backend/src/routes/authRoutes.js | No password policy enforcement, no reset flow/outbox, no change-password endpoint, no lock-out, no profile time zone, no refresh-reuse detection found. |
| AUTH-19 | Missing | backend/src/routes/authRoutes.js | No password policy enforcement, no reset flow/outbox, no change-password endpoint, no lock-out, no profile time zone, no refresh-reuse detection found. |
| SEC-13 | Missing | backend/src/index.js | No CSRF middleware found. |
| SEC-14 | Partial | backend/src/index.js, frontend/nginx.conf | Helmet is present but contentSecurityPolicy is explicitly disabled unless ENABLE_CSP=true; nginx.conf does not set CSP/X-Frame-Options/Referrer-Policy independently. |
| SEC-15 | Missing | backend/src/routes/entryRoutes.js | No magic-byte/signature validation found, only (at most) extension/MIME checks. |
| SEC-16 | Missing | frontend/nginx.conf, backend/src/routes | Uploads directory appears to be reachable as static content via nginx/uploads proxy rather than an authenticated serving endpoint — needs verification and likely rework. |
| SEC-17 | Missing | backend/src/db/seed.js | Seed script existence confirmed in v1.0 but gating on SEED_DEMO env var not confirmed — needs explicit guard. |
| SEC-18 | Partial | backend/.env.example | Example file exists and uses placeholders correctly; needs the new v1.1 variables (SEED_DEMO, SMTP_*, model-lifecycle thresholds) added. |
| SEC-19 | Partial | backend/src/index.js, routes/adminRoutes.js | Only the admin dataset-upload route has an explicit size limit (25MB); no general JSON body-size limit confirmed at the app level. |
| SEC-20 | Missing | .github/workflows | No CI workflow exists at all yet. |
| SEC-21 | Missing | backend/src/routes/nlpRoutes.js | No explicit axios timeout/retry-with-backoff found on calls to the ML microservice. |
| AUDIT-1 | Missing | backend/src/db/migrations | No audit_logs table or related endpoints exist. |
| AUDIT-2 | Missing | backend/src/db/migrations | No audit_logs table or related endpoints exist. |
| AUDIT-3 | Missing | backend/src/db/migrations | No audit_logs table or related endpoints exist. |
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
| NLP-10 | Missing | ml_service/main.py | predict-disease appears to return a single top prediction, not top-3; no explicit confirmation that patient identifiers are excluded from the payload (needs a code-level check-and-enforce pass). |
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
| API-1 | Missing | backend/src | No consistent error envelope confirmed across routes; no OpenAPI/Swagger route found. |
| API-2 | Missing | backend/src | No consistent error envelope confirmed across routes; no OpenAPI/Swagger route found. |
| API-3 | Partial | backend/src/routes/entryRoutes.js, reminderRoutes.js, reportRoutes.js, adminRoutes.js | Pagination (limit/offset) exists on 4 route files; not confirmed on symptoms, medications, appointments, feedback, doctors, caregiver lists. |
| OBS-2 | Missing | backend/src/index.js | Only a generic health check style endpoint implied by docker-compose; a distinct /api/ready that checks DB+ML connectivity is not confirmed. |
| OBS-1 | Partial | backend/src/index.js | morgan('dev') text logging is present; not structured JSON, and no request-id correlation confirmed. |
| DEPLOY-11 | Missing | .github/workflows | No CI workflow exists. |
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
| PERF-5 | Partial | backend/src/routes/entryRoutes.js etc. | Default limit=50 confirmed on entries; not confirmed as the default everywhere pagination exists. |
| PERF-7 | Missing | frontend build config, CI | No bundle-size budget or Lighthouse check found. |
| MAIN-5 | Partial | README.md, SymptomLog_Launch_Guide.docx | A launch guide exists; no dedicated runbook (backup/restore, retraining, rollback, incident steps) confirmed. |
| MAIN-7 | Missing | backend/src/db/migrations | No rollback/down scripts found for any of the 7 migrations; none are documented as irreversible either. |

## Phase sequencing implied by this analysis

- **Phase 0** closes: SEC-20, DEPLOY-11, OBS-1, OBS-2, API-1, API-2, API-3 (remaining routes), plus lint/format tooling and `.env.example` additions.
- **Phase 1** closes: AUTH-12..19, SEC-13..19, SEC-21, AUDIT-1..3.
- **Phase 2** closes: ENTRY-8..11, TRIAGE-7..10, NLP-8..10.
- **Phase 3** closes: REM-8..14, APPT-5..9, DOC-9, DOC-12, CARE-4..7, REPORT-3..5.
- **Phase 4** closes: PRIV-1..6, ADMIN-10..15, CLIN-5.
- **Phase 5** closes: UI-6..16, DASH-1..5, HIST-3..5, INSIGHTS-2..4, A11Y-1..8, CLIN-4 (audit pass).
- **Phase 6** closes: TEST-1..7, PERF-7, MAIN-5, MAIN-7.
