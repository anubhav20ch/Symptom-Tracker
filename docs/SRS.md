# SymptomLog — Software Requirements Specification (v1.1)

Author: Anubhav Choudhary (24BYB1090) — Date: October 2026


## Revision History


| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-10-12 | 1.0 | Initial SRS derived from project report and implemented codebase | Anubhav Choudhary |
| 2026-10-13 | 1.1 | Adds authentication hardening, security/privacy, audit logging, clinical-logic detail, richer medication/appointment/sharing/report rules, admin model-lifecycle management, API/observability conventions, full frontend design system, accessibility, and test requirements. All new requirement IDs are listed in Section 10. | Anubhav Choudhary |


## Table of Contents


## 1. Introduction


### 1.1 Purpose

This Software Requirements Specification (SRS) is the authoritative, versioned statement of what SymptomLog is required to do. Version 1.1 extends version 1.0 (which captured the as-built feature set) with requirements needed to make the platform safe to operate beyond a single trusted developer machine: stronger authentication and account recovery, CSRF/CSP/upload hardening, audit logging, a single versioned triage engine with stored reasoning, privacy controls (consent, export, deletion, access logging), a governed machine-learning model lifecycle (versioning, gated activation, rollback), consistent API conventions, observability, and a complete redesign of the frontend to the standard of a real clinical record system rather than a generated template.


### 1.2 Scope

This document covers the same three services as v1.0 (React/Vite frontend, Node.js/Express backend, Python/FastAPI ML microservice) plus: an `audit_logs` subsystem; a privacy/consent subsystem; a model-version registry for the ML microservice; and a restyled frontend following the design brief in Section 11. Out of scope: multi-tenant public hosting, real email delivery in production (development uses a captured SMTP outbox only), and any dosing or drug-interaction advice (explicitly prohibited, see MED-4).


### 1.3 Definitions, Acronyms, and Abbreviations


| Term | Definition |
| --- | --- |
| CSRF | Cross-Site Request Forgery |
| CSP | Content-Security-Policy HTTP response header |
| PWA | Progressive Web App (installable, offline-capable web app) |
| A11Y | Accessibility |
| SMTP outbox | A development-only captured mail store; no real email is sent outside production |
| Model registry | The record of trained ML model versions, their metrics, and which one is currently active |
| Least privilege (physician) | A physician may access only the records of a patient with whom they have an appointment |
| Metrics-gated activation | A newly trained model is only promoted to active use if its evaluation metrics clear a configured minimum |


### 1.4 References

- SymptomLog SRS v1.0 (superseded by this document; retained for historical traceability).
- SymptomLog Project Report and Launch Guide.
- Project source: backend/, frontend/, ml_service/, docker-compose.yml.
- NHS.UK and GOV.UK service manual design patterns (referenced for Section 11 design brief).

## 2. Overall Description


### 2.1 Product Perspective

SymptomLog remains a self-contained, three-tier system: a browser-based single-page frontend, a REST API backend, and an independent ML microservice, deployable natively or via Docker Compose on a single operator's machine.


### 2.2 User Classes


| User Class | Description |
| --- | --- |
| Patient | Registers, logs symptoms, manages medications/reminders, books appointments, views history/reports, manages caregiver shares, consent, export and deletion of their own data. |
| Caregiver | Holds a scoped, time-limited, revocable read-only link; never registers an account. |
| Physician | Separate authentication; least-privilege access limited to patients with whom they have an appointment. |
| Administrator | Manages physicians, appointments, audit log, and the ML model registry (upload, retrain, activate, roll back). |


### 2.3 Design and Implementation Constraints (New/Changed in 1.1)

- All cookie-authenticated, state-changing requests must carry and validate a CSRF token (SEC-13).
- No real email is sent in development; outgoing mail is captured to a local outbox (AUTH-14).
- The triage engine must exist as a single versioned module; triage logic may not be duplicated or inlined elsewhere (TRIAGE-7).
- No dosing advice or drug-interaction checking may be implemented anywhere in the system (MED-4).
- Self-care guidance text is static, dated content labelled "pending clinical review" until a clinician signs off (CLIN-5).
- Seed/demo accounts are created only when the SEED_DEMO environment variable is explicitly set to true (SEC-17); all seed and test data must be synthetic (TEST-7).

## 3. System Architecture Additions


### 3.1 Audit Logging

An `audit_logs` table records authentication events and every cross-ownership data access (a physician or administrator viewing a record that is not their own account's data), each row carrying actor type/id, action, target type/id, timestamp, and request id. The table is append-only at the API level (AUDIT-1 to AUDIT-3).


### 3.2 Model Registry

The ML microservice maintains a model_versions registry: each trained artifact is stored with its training dataset reference, holdout metrics, training timestamp, and an activation flag. Exactly one version per model type (disease-prediction, extraction) is active at a time. Activation requires metrics to clear a configured minimum threshold (ADMIN-13); administrators may roll back to a previously active version (ADMIN-14).


### 3.3 Consent and Privacy Store

A `consents` table records the timestamp and version of terms accepted at registration. Data-subject requests (export, deletion) are tracked with a status and completion timestamp so PRIV-2 and PRIV-3 can be audited.


## 4. Functional Requirements — New and Extended in v1.1

Requirements AUTH-1 through UI-5 from SRS v1.0 remain in force unchanged unless explicitly superseded below. Only new or changed requirement IDs are listed in this section; see Section 10 for the complete v1.1 delta index.


### 4.1 Authentication and Account Management (AUTH-12 .. AUTH-19)

- **AUTH-12**  The system shall enforce a minimum password policy at registration and password change (minimum length 10, at least one letter and one digit).
- **AUTH-13**  The system shall support password recovery: a patient requests a reset by email; the system issues a single-use, time-limited reset token and emails a reset link.
- **AUTH-14**  In development/test environments, outgoing email (including reset links) shall be captured to a local SMTP outbox rather than sent to a real mail server; production requires a real SMTP/API provider configured via environment variables.
- **AUTH-15**  An authenticated patient shall be able to change their password by supplying their current password plus a new password meeting AUTH-12.
- **AUTH-16**  The system shall lock an account after five consecutive failed login attempts within fifteen minutes, independent of the general rate limit (SEC-6).
- **AUTH-17**  A locked account shall automatically unlock after a configured cooldown period (default thirty minutes), or immediately upon a successful password reset.
- **AUTH-18**  A patient profile shall include an IANA time zone field; all date/time displays and reminder scheduling for that patient shall use it (see REM-8).
- **AUTH-19**  The system shall detect reuse of an already-rotated refresh token and, on detection, shall revoke every active session for that account and require re-authentication.

### 4.2 Security Hardening (SEC-13 .. SEC-21)

- **SEC-13**  Every state-changing request authenticated via cookie (not solely bearer token) shall require and validate a CSRF token.
- **SEC-14**  Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy headers shall be served at the nginx edge for the frontend, in addition to the backend's existing Helmet headers.
- **SEC-15**  Uploaded files shall be validated by file-signature (magic bytes) inspection, not solely by declared content-type or extension, before being accepted.
- **SEC-16**  Uploaded files (attachments, reports) shall be served only through an authenticated, ownership-checked backend endpoint; they shall never be directly static-served by the web server.
- **SEC-17**  Demonstration/seed accounts shall be created only when the SEED_DEMO environment variable is explicitly set to true; they shall never be created by default in a production build.
- **SEC-18**  No secret value shall be committed to source control; .env.example shall document every required variable name with a placeholder, never a real value; all runtime secrets shall be read only from the environment.
- **SEC-19**  Request body size limits shall be enforced on every endpoint, with a tighter limit for JSON bodies than for multipart file uploads.
- **SEC-20**  The CI pipeline shall run a dependency vulnerability audit (e.g., npm audit, pip-audit) on every push and shall fail the build on any high or critical finding.
- **SEC-21**  Every outbound call from the backend to the ML microservice shall carry an explicit timeout and shall retry with backoff on failure, never leaving a client request pending indefinitely.

### 4.3 Audit Logging (AUDIT-1 .. AUDIT-3)

- **AUDIT-1**  The system shall write an audit_logs entry for every authentication event: login success, login failure, logout, password change, and account lock-out.
- **AUDIT-2**  The system shall write an audit_logs entry whenever a physician or administrator accesses a specific patient's data.
- **AUDIT-3**  audit_logs entries shall be immutable via the API (no update or delete endpoint) and readable only by an authenticated administrator.

### 4.4 Symptom Entry Detail (ENTRY-8 .. ENTRY-11)

- **ENTRY-8**  A symptom entry shall support a structured body-region field, selectable via a front/back body map, stored alongside any free-text description.
- **ENTRY-9**  A symptom entry shall record an onset date/time and an optional resolution date/time.
- **ENTRY-10**  A symptom entry may be marked as a follow-up to a prior entry of the same symptom, linking the two records.
- **ENTRY-11**  All entry fields shall be validated server-side for required combinations, ranges, and types, independent of any client-side validation.

### 4.5 Triage Engine (TRIAGE-7 .. TRIAGE-10)

- **TRIAGE-7**  The triage engine shall be implemented as a single versioned module; every triage result shall record the module's version identifier. Thresholds remain exactly those defined in v1.0 TRIAGE-2 through TRIAGE-5; this document introduces no new medical content.
- **TRIAGE-8**  When an entry matches criteria for more than one tier, the engine shall resolve the conflict using a fixed precedence order: Urgent/Emergency, then Chronic Care, then Recurring Pattern, then Routine Acute.
- **TRIAGE-9**  The specific rule and threshold that produced a triage result shall be stored with the result (not only the resulting tier), to support the "Why am I seeing this?" disclosure (UI-10).
- **TRIAGE-10**  An Urgent/Emergency result shall always display the emergency notice directing the patient to contact local emergency services immediately.

### 4.6 NLP / ML Prediction (NLP-8 .. NLP-10)

- **NLP-8**  Every extraction or disease-prediction result shall record the specific model version that produced it.
- **NLP-9**  When the top disease-prediction confidence falls below a configured threshold, the UI shall show a low-confidence notice and prompt the patient to review or adjust the result manually, rather than asserting it outright.
- **NLP-10**  The disease-prediction endpoint shall return the top three candidate conditions with their individual confidence scores; no patient-identifying field (name, email, user id) shall ever be transmitted to the ML microservice, only the free text and structured clinical fields needed for prediction.

### 4.7 Medication and Reminder Scheduling (REM-8 .. REM-14)

- **REM-8**  Reminder scheduling and due-time evaluation shall use the patient's profile time zone (AUTH-18), not server local time.
- **REM-9**  The background scheduler shall not dispatch more than one notification for the same due dose; dispatch shall be idempotent across scheduler ticks.
- **REM-10**  A dose not marked taken or skipped within a configured grace window after its due time shall be automatically marked missed.
- **REM-11**  The system shall compute an adherence percentage from taken/skipped/missed counts over a selected period.
- **REM-12**  A reminder shall automatically stop firing once its prescribed duration or explicit expiry date has elapsed.
- **REM-13**  The system shall detect invalid or expired push subscriptions (e.g., on a 404/410 response from the push service) and remove them.
- **REM-14**  Notification text shown on a locked device shall contain no diagnosis, condition name, or medication name beyond neutral wording such as "Medication reminder".

### 4.8 Appointments (APPT-5 .. APPT-9)

- **APPT-5**  The system shall send a reminder notification ahead of a scheduled appointment.
- **APPT-6**  The system shall reject booking a physician for a time slot that overlaps one of that physician's existing confirmed appointments.
- **APPT-7**  An appointment shall only be bookable for a future date and time.
- **APPT-8**  A full status history (previous status, new status, actor, timestamp) shall be retained for every appointment.
- **APPT-9**  Cancelling or rescheduling an appointment shall notify the counterpart party (patient or physician).

### 4.9 Physician Portal (DOC-9 .. DOC-12)

- **DOC-9**  A physician shall be able to access data (symptom history, profile) only for a patient with whom they currently have, or have had, an appointment; general browsing of the patient base is prohibited.
- **DOC-10**  A prescription issued by a physician shall be created as a medication record linked to the issuing physician and the appointment, visible to the patient through the normal medications view, not a separate disconnected table.
- **DOC-11**  The physician portal shall provide a worklist view listing the physician's upcoming and recent appointments sorted by time, with current status.
- **DOC-12**  A physician's access to a given patient's record shall lapse if no appointment between them exists within a configured look-back window.

### 4.10 Caregiver Sharing (CARE-4 .. CARE-7)

- **CARE-4**  A patient shall be able to list every currently active caregiver share link they have created.
- **CARE-5**  A patient shall be able to revoke a caregiver share link before its natural expiry.
- **CARE-6**  A patient shall be able to limit which sections (e.g., symptoms, medications, appointments) are visible through a given share link.
- **CARE-7**  Every access to a caregiver link shall be logged with a timestamp and shall be visible to the owning patient.

### 4.11 Reports (REPORT-3 .. REPORT-5)

- **REPORT-3**  A patient shall be able to choose which sections (symptoms, medications, appointments) are included when generating a report.
- **REPORT-4**  A generated report shall be stored with a content checksum so that tampering after generation can be detected.
- **REPORT-5**  A report download shall be permitted only to the owning patient or a physician with an active appointment link to that patient.

### 4.12 Privacy (PRIV-1 .. PRIV-6)

- **PRIV-1**  The system shall capture explicit, timestamped consent to data processing at registration, before any health data is stored.
- **PRIV-2**  An authenticated patient shall be able to export the entirety of their own data in a machine-readable (JSON) format.
- **PRIV-3**  An authenticated patient shall be able to request deletion of their account and data; the request shall be processed within a defined window and its status shall be queryable.
- **PRIV-4**  A patient shall be able to view a log of who has accessed their data (physician views, caregiver link views, administrator access).
- **PRIV-5**  A scheduled retention job shall purge data past its configured retention period (e.g., expired caregiver share links, audit log entries beyond policy).
- **PRIV-6**  Account deletion shall cascade correctly across every related table, leaving no orphaned records referencing the deleted account.

### 4.13 Administration and Model Lifecycle (ADMIN-10 .. ADMIN-15)

- **ADMIN-10**  An administrator shall be able to view and filter the audit log (by actor, action, date range).
- **ADMIN-11**  Dataset upload validation shall additionally compute and display basic class-balance statistics before retraining is confirmed.
- **ADMIN-12**  Model retraining shall run as an asynchronous background job; the triggering request shall return immediately with a job id, and progress/status shall be pollable.
- **ADMIN-13**  A newly trained model version shall be activated only if its holdout metrics meet or exceed a configured minimum threshold (metrics-gated activation); otherwise it remains inactive pending administrator override.
- **ADMIN-14**  An administrator shall be able to roll back the active model to any previously activated version.
- **ADMIN-15**  An administrator shall be able to view the full history of model versions with their training dataset reference, metrics, and activation status.

### 4.14 API, Observability, and Deployment Conventions (API-1 .. API-3, OBS-1 .. OBS-2, DEPLOY-11)

- **API-1**  Every error response shall use a consistent JSON envelope: { error: { code, message, details } }.
- **API-2**  OpenAPI documentation describing every implemented route shall be served at /api/docs and kept in sync with the implementation.
- **API-3**  Every list-returning endpoint shall support pagination (limit/offset or cursor) with a consistent response envelope (items, total, page info).
- **OBS-1**  Backend logs shall be structured JSON, shall include a request id on every line, and shall never contain health content (symptom text, diagnoses, free-text fields) or secrets.
- **OBS-2**  The backend shall expose /api/health (liveness only) and /api/ready (readiness; verifies database and ML-service connectivity) as distinct endpoints.
- **DEPLOY-11**  The CI pipeline shall build all three containers, bring them up via Docker Compose, and verify every service reports healthy before the build is considered passing.

### 4.15 Clinical Content Governance (CLIN-4, CLIN-5, MED-4)

- **CLIN-4**  All predictive or triage-derived language presented to a patient shall use hedged phrasing ("may be consistent with", "may be associated with") and shall never assert a diagnosis ("you have").
- **CLIN-5**  Self-care guidance text shall be static content carrying a "last reviewed" date and a visible "pending clinical review" label until formally signed off by a clinician; it shall not be generated or altered by any model.
- **MED-4**  The system shall not provide dosing advice or drug-interaction checking of any kind; medication records store only what the patient or physician explicitly enters.

## 5. Frontend and Interface Requirements — New in v1.1

These requirements implement the design brief in Section 11 and supersede the general UI-1 .. UI-5 requirements from v1.0 wherever they conflict on presentation (not on access-control behaviour, which is unchanged).


### 5.1 Navigation and Layout (UI-6 .. UI-14)

- **UI-6**  The patient application shall present a persistent left sidebar with text labels (Overview, Log a symptom, History, Insights, Medicines, Appointments, Reports, Sharing) at 1024px and wider, and a bottom tab bar below that width.
- **UI-7**  The Overview page shall present a main column (active symptoms table, today's doses checklist) and a narrower side rail (next appointment, latest guidance, 7-day adherence), content constrained to a maximum width of approximately 1120px.
- **UI-8**  The symptom-logging page shall present a single-column intake form; as the patient types free text, a side panel titled "What we picked up" shall show editable chips (symptom, location, severity, triggers) with their confidence.
- **UI-9**  The logging page shall include a body-map control (front/back toggle, labelled region buttons) with an equivalent text list for users who cannot use the visual map.
- **UI-10**  The classification result screen shall show the tier in a labelled panel with a left rule and a distinct icon shape (never colour alone), a plain-language heading, the reasons for the result, recommended actions, suggested specialist, confidence, the medical disclaimer, a helpful/not-helpful control, and a "Book an appointment" action that pre-fills the symptom.
- **UI-11**  The history page shall present a dense table with a filter row, column sorting, pagination, and expandable rows for full entry detail.
- **UI-12**  The trend chart shall plot one line per selected symptom with a fixed 0–10 y-axis, medicine start/stop markers, tooltips, a range switcher, and a "show as table" toggle.
- **UI-13**  The medicines page shall present a day timeline of doses; the alarm shall be a focus-trapping alertdialog offering Taken, Skip (with reason), and Snooze, with both a visual alert and sound.
- **UI-14**  The physician portal shall use a three-pane layout: worklist, appointment detail, and patient summary timeline.

### 5.2 Overview Page Detail (DASH-1 .. DASH-5)

- **DASH-1**  The Overview heading shall show the current date in long form (e.g., "Monday, 12 October") and one line of status.
- **DASH-2**  The active-symptoms table shall show symptom, duration since onset, severity as a number paired with a segmented bar, tier label, and a small trend line.
- **DASH-3**  Today's doses shall be shown as a checklist with their scheduled times.
- **DASH-4**  The side rail shall show the next appointment's date, time, and physician.
- **DASH-5**  The side rail shall show the latest guidance with a "Why am I seeing this?" disclosure and a 7-day adherence summary.

### 5.3 History and Insights (HIST-3 .. HIST-5, INSIGHTS-2 .. INSIGHTS-4)

- **HIST-3**  The history table shall support sorting by any displayed column.
- **HIST-4**  The history table shall support pagination.
- **HIST-5**  History rows shall be expandable to show full entry detail inline without navigating away.
- **INSIGHTS-2**  Insight text shall be worded as an association ("may be associated with"), never as a causal claim.
- **INSIGHTS-3**  An insight that requires a minimum number of entries shall show a "need N more entries" message when the patient's data is insufficient.
- **INSIGHTS-4**  The insights page shall offer a per-symptom trend chart with a toggle to view the same data as a table.

### 5.4 Accessibility (A11Y-1 .. A11Y-8)

- **A11Y-1**  Colour shall never be the sole means of conveying tier or severity information; an icon shape or text label shall always accompany it.
- **A11Y-2**  Text shall maintain a contrast ratio of at least 4.5:1 against its background in both light and dark themes.
- **A11Y-3**  Every interactive control shall be reachable and operable via keyboard alone, in a logical tab order.
- **A11Y-4**  The medication alarm dialog shall trap focus and use the ARIA alertdialog role.
- **A11Y-5**  Every form field shall have an associated, visible label; placeholder text alone shall not serve as a label.
- **A11Y-6**  Validation error summaries shall be announced to assistive technology and shall link to the offending field.
- **A11Y-7**  Every non-text control (icon, chart marker) shall have an accessible text alternative.
- **A11Y-8**  All motion and animation shall respect the prefers-reduced-motion media feature.

### 5.5 PWA and Public Pages

- **UI-15**  The frontend shall be installable as a Progressive Web App with a manifest and a service worker providing basic offline shell caching.
- **UI-16**  The application shall provide public, unauthenticated pages: Home, How triage works, Privacy, Medical disclaimer, and Help.

## 6. Test Requirements (TEST-1 .. TEST-7)

- **TEST-1**  Boundary unit tests shall exercise every triage tier threshold at and immediately around its boundary value.
- **TEST-2**  Integration tests shall verify patient data isolation: one patient's credentials shall never retrieve another patient's data.
- **TEST-3**  Integration tests shall verify physician least-privilege access (DOC-9, DOC-12).
- **TEST-4**  Contract tests shall verify the ML microservice's request/response shapes and the backend's fallback path when the ML microservice is unreachable.
- **TEST-5**  An end-to-end (Playwright) test shall cover the smoke flow: register, log a symptom, see classification, book an appointment, generate a report.
- **TEST-6**  Component tests shall cover the intake form, the chip editor, the trend chart, and the alarm dialog.
- **TEST-7**  All seed and test data shall be synthetic; no real patient data shall appear in any seed, fixture, or test.

## 7. Non-Functional Requirements — Extended in v1.1

Non-functional requirements SEC-1 .. SEC-12, PERF-1 .. PERF-4, REL-1 .. REL-4, USE-1 .. USE-4, MAIN-1 .. MAIN-3, PORT-1 .. PORT-2, and CLIN-1 .. CLIN-3 from SRS v1.0 remain unchanged. The following are new in v1.1.

- **PERF-5**  Every list-returning endpoint shall default to a bounded page size (20–50 items) unless the client explicitly requests otherwise.
- **PERF-7**  The production frontend bundle size shall be checked against a defined budget in CI; Lighthouse performance and accessibility scores shall be checked in CI.
- **MAIN-5**  A README shall document local and Docker setup; a runbook shall document backup/restore, retraining, rollback, and incident-response procedures.
- **MAIN-7**  Every database migration shall ship with a corresponding rollback script, or shall be explicitly documented as irreversible together with the reason.

## 8. Machine Learning Subsystem — Model Lifecycle (Section 8.6)

Building on the v1.0 model description (Section 8 of v1.0, unchanged), the ML microservice now exposes a governed model lifecycle:


| Endpoint | Purpose |
| --- | --- |
| GET /version | Returns the running backend and ML-service build version and the currently active model version for each model type. |
| POST /models/activate | Activates a specific trained model version, subject to metrics-gated activation (ADMIN-13). |
| GET /models | Lists the full model-version history with metrics and activation status (supports ADMIN-15). |
| POST /retrain | Unchanged endpoint, now triggers an asynchronous job (ADMIN-12) instead of a synchronous call. |
| GET /retrain/:jobId | Polls the status/progress of an asynchronous retraining job. |


## 9. Known Limitations and Scope Exclusions

All limitations documented in SRS v1.0 Section 9 remain in force unchanged (background push delivery requires the browser process to remain running; sleep/wake timing is approximate; strict CSP remains deliberate future work beyond the baseline headers now required by SEC-14; multi-tenant public hosting remains out of scope). Additionally:

- Real email delivery is out of scope for development/test; only the captured SMTP outbox is required there (AUTH-14).
- No dosing advice or drug-interaction checking will be added at any future version without a distinct, separately reviewed specification (MED-4).

## 10. Version 1.1 — New and Changed Requirements

This section is the authoritative delta index referenced by the gap-analysis process: every ID listed here is new in v1.1 and did not exist in v1.0. IDs not listed here (e.g., AUTH-1 .. AUTH-11, TRIAGE-1 .. TRIAGE-6) are unchanged from v1.0.


| Area | New Requirement IDs |
| --- | --- |
| Authentication & accounts | AUTH-12, AUTH-13, AUTH-14, AUTH-15, AUTH-16, AUTH-17, AUTH-18, AUTH-19 |
| Security hardening | SEC-13, SEC-14, SEC-15, SEC-16, SEC-17, SEC-18, SEC-19, SEC-20, SEC-21 |
| Audit logging | AUDIT-1, AUDIT-2, AUDIT-3 |
| Symptom entry detail | ENTRY-8, ENTRY-9, ENTRY-10, ENTRY-11 |
| Triage engine | TRIAGE-7, TRIAGE-8, TRIAGE-9, TRIAGE-10 |
| NLP / ML prediction | NLP-8, NLP-9, NLP-10 |
| Medication & reminders | REM-8, REM-9, REM-10, REM-11, REM-12, REM-13, REM-14 |
| Appointments | APPT-5, APPT-6, APPT-7, APPT-8, APPT-9 |
| Physician portal | DOC-9, DOC-10, DOC-11, DOC-12 |
| Caregiver sharing | CARE-4, CARE-5, CARE-6, CARE-7 |
| Reports | REPORT-3, REPORT-4, REPORT-5 |
| Privacy | PRIV-1, PRIV-2, PRIV-3, PRIV-4, PRIV-5, PRIV-6 |
| Administration & model lifecycle | ADMIN-10, ADMIN-11, ADMIN-12, ADMIN-13, ADMIN-14, ADMIN-15 |
| API conventions | API-1, API-2, API-3 |
| Observability | OBS-1, OBS-2 |
| Deployment | DEPLOY-11 |
| Clinical content governance | CLIN-4, CLIN-5, MED-4 |
| Frontend layout & pages | UI-6, UI-7, UI-8, UI-9, UI-10, UI-11, UI-12, UI-13, UI-14, UI-15, UI-16 |
| Overview page | DASH-1, DASH-2, DASH-3, DASH-4, DASH-5 |
| History & insights | HIST-3, HIST-4, HIST-5, INSIGHTS-2, INSIGHTS-3, INSIGHTS-4 |
| Accessibility | A11Y-1, A11Y-2, A11Y-3, A11Y-4, A11Y-5, A11Y-6, A11Y-7, A11Y-8 |
| Testing | TEST-1, TEST-2, TEST-3, TEST-4, TEST-5, TEST-6, TEST-7 |
| Performance (new) | PERF-5, PERF-7 |
| Maintainability (new) | MAIN-5, MAIN-7 |


## 11. Design Brief — Visual and Interaction Design System

This section is normative for appearance and interaction, not only inspirational. It is the basis for docs/DESIGN.md and for the UI-6 .. UI-16, DASH-1 .. DASH-5, and A11Y-1 .. A11Y-8 requirements above.


### 11.1 Intent

The product shall read as a patient portal or clinical record system, not a SaaS marketing site: structure and tone from NHS/GOV.UK service patterns (forms, error summaries, plain content), trend presentation from consumer health trend views, and dense scannable tables from clinical record systems.


### 11.2 Explicitly Prohibited Patterns

- Purple or indigo gradients; glassmorphism.
- Grids of identical large rounded cards each with an icon in a coloured circle.
- A hero section with a floating app mockup.
- Emoji anywhere in the interface.
- Default Tailwind or Material blue as the primary brand colour.
- Everything centred; heavy drop shadows and hover-lift effects.
- Shimmer skeleton loaders on every screen.
- Fake testimonials, fake statistics, or "trusted by" logo strips.
- "Welcome back" greetings and playful/cute error copy.

### 11.3 Layout

- Patient app: left sidebar with text labels at 1024px+ (Overview, Log a symptom, History, Insights, Medicines, Appointments, Reports, Sharing); bottom tab bar below that width.
- Content area: a main column plus a narrow side rail, maximum width approximately 1120px.
- Prefer tables, timelines, and definition lists for dense information; prefer 1px borders over shadows.

### 11.4 Design Tokens


#### Typography

- Source Sans 3 for interface text, Source Serif 4 for page titles and large numerals, IBM Plex Mono for IDs/timestamps — all self-hosted via @fontsource.
- 16px base size, 1.5 line height, scale 14/16/18/22/28/36, tabular numerals for all numeric values.

#### Light theme colours


| Token | Value |
| --- | --- |
| Background | #F6F4EF |
| Surface | #FFFFFF |
| Border | #DDD8CC |
| Text | #1B2430 |
| Muted text | #5B6572 |
| Primary | #1D5B4A (hover #164838) |
| Caution | #8A5A00 on #FFF4DB |
| Danger | #A3262A on #FDECEC |
| Info | #1F5FA8 |
| Success | #1D6B3A |
| Focus ring | 2px primary, 2px offset |


#### Severity ramp (paired with the numeral, never colour alone)

#EFE6D2 → #E8D2A0 → #E0B96B → #D89A45 → #C97A32 → #B85A2A → #A0402A → #7F2D2A (light to dark).


#### Dark theme (designed, not inverted)


| Token | Value |
| --- | --- |
| Background | #12171C |
| Surface | #1A2128 |
| Border | #2B343D |
| Text | #E6E9EC |
| Muted text | #9AA5B1 |
| Primary | #6CC3A5 |

- Dark theme follows prefers-color-scheme until the patient explicitly chooses a theme.

#### Shape, motion, icons

- 4px radius on controls, 6px on panels; no gradients; no pill buttons except for tags.
- Buttons: solid primary, outlined secondary, text. Sentence case everywhere.
- Icons: Lucide, 16–18px, 1.75 stroke, inline with text, used only where they aid scanning.
- Motion: 120–160ms, opacity/transform only, disabled under prefers-reduced-motion (A11Y-8).

### 11.5 Copy Style

- Neutral, clinical tone at roughly an eighth-grade reading level; no exclamation marks; no emoji.
- Example empty state: "Nothing logged yet. When you log a symptom it appears here with its severity over time."
- Example error: "We could not save this entry. Check your connection and try again."
- Dates rendered as "12 Oct 2026, 09:30" in the patient's own time zone (AUTH-18).
- Predictive language always hedged: "may be consistent with", never "you have" (CLIN-4).

### 11.6 Page-Level Specifications


#### Overview

See DASH-1 .. DASH-5.


#### Symptom logging

See UI-8, UI-9, UI-10.


#### History and insights

See UI-11, UI-12, HIST-3 .. HIST-5, INSIGHTS-2 .. INSIGHTS-4.


#### Medicines

See UI-13.


#### Physician portal

Compact, neutral, same accent colour, no emotive copy. See UI-14, DOC-9 .. DOC-12.


#### Administrator portal

Plain tables, a stats strip, the audit log viewer (AUDIT-3, ADMIN-10), and a model-versions page showing metrics and the activate/roll-back actions (ADMIN-13 .. ADMIN-15).


#### Public pages

Home, How triage works, Privacy, Medical disclaimer, Help (UI-16). The home page is modest: one headline ("Keep a clear record of how you feel, and know when to see a doctor."), three short sections, one primary action, the disclaimer visible, no stock imagery.


### 11.7 Design Deliverables

- docs/DESIGN.md documenting tokens, components, and patterns.
- Playwright screenshots of Overview, Log, Result, History, Medicines, Physician worklist, and Admin pages at 360/768/1280px, in light and dark, saved to docs/screenshots/.

## 12. Appendix — Traceability Summary

A living, per-requirement traceability table (requirement ID, implementing file(s), test file/name) is maintained separately in docs/TRACEABILITY.csv rather than duplicated here, since it changes with every commit.
