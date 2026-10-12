# SymptomLog — Decisions Log

Small decisions made autonomously while implementing the SRS v1.1 completion brief, recorded here per instruction 6 of the brief ("Decide small questions yourself and record them in docs/DECISIONS.md").

## 2026-10-13 — SRS v1.1 authored from the completion brief, not supplied separately

The completion brief referenced `SymptomLog_SRS_v1.1.docx` as an existing, authoritative input, but no such file existed in the repository (only the v1.0 SRS produced in a prior session). The brief itself specifies every new requirement ID range (AUTH-12..19, SEC-13..21, AUDIT-1..3, ENTRY-8..11, TRIAGE-7..10, NLP-8..10, REM-8..14, APPT-5..9, DOC-9..12, CARE-4..7, REPORT-3..5, PRIV-1..6, ADMIN-10..15, API-1..3, OBS-1..2, DEPLOY-11, CLIN-4/5, MED-4, UI-6..16, DASH-1..5, HIST-3..5, INSIGHTS-2..4, A11Y-1..8, TEST-1..7, PERF-5/7, MAIN-5/7) together with enough prose to write real requirement text for each.

**Decision:** authored `docs/SymptomLog_SRS_v1.1.docx` and `docs/SRS.md` directly from the brief's own content, extending the existing v1.0 document rather than inventing unrelated requirements. The user confirmed mid-task to proceed with "the new version of srs 1.1."

## 2026-10-13 — `docs/SRS.md` generated directly, not via `pandoc`

The brief's exact instruction was `pandoc docs/SymptomLog_SRS_v1.1.docx -t gfm -o docs/SRS.md`. `pandoc` is not installed on this machine (confirmed via `command -v pandoc`), and LibreOffice (needed for the skill's own PDF-preview verification step) is also not installed.

**Decision:** generated `docs/SRS.md` from the same in-memory document model used to build the `.docx` (single script, two outputs), so the two files cannot drift apart even though no pandoc conversion step actually ran. If `pandoc` becomes available later, re-running it against the `.docx` should produce materially the same content as a sanity check.

## 2026-10-13 — Gap analysis grain and "Partial" semantics

The SRS has 233 distinct requirement IDs across v1.0 and v1.1. Rather than a binary done/missing split, a third "Partial" status is used for cases where code exists that partially satisfies a requirement but a specific, named gap remains (e.g., SEC-14: Helmet headers exist but CSP is off by default and nginx does not add its own security headers).

**Decision:** `docs/GAP_ANALYSIS.md` rows cite the exact files inspected and the specific missing piece, so each "Partial" or "Missing" row is independently actionable without re-deriving the audit.

## 2026-10-13 — Phase 3: missed-dose detection has a documented midnight edge case

REM-10's missed-dose check compares "now" against "today's" scheduled occurrence in the patient's own time zone, using the current local date to look up (and insert) the `dose_logs` row. A reminder scheduled within the grace period's width of local midnight (e.g. 23:30 with a 60-minute grace) can roll into the next calendar day before the grace period elapses -- by the time the check would fire, `localDate` has already advanced, and the scheduler only ever evaluates "is today's occurrence overdue," never "was yesterday's."

**Decision:** left as a documented, narrow limitation rather than building a two-day lookback (checking both today's and yesterday's occurrence every tick). The window affected is at most the grace period's width (60 minutes) out of each day, and the existing precedent in this codebase (v1.0's own documented limitations around sleep/wake timing and closed-browser push delivery) is to name a real, narrow gap rather than add real complexity for it. Noted in `backend/src/services/reminderScheduler.js` and here.

## 2026-10-13 — Phase 3: a fixed 30-minute appointment slot width, since none is modeled

APPT-6 requires rejecting a double-booked physician slot, but the `appointments` table has no duration column — only a single `scheduled_at` instant.

**Decision:** added a named, documented constant (`SLOT_DURATION_MINUTES = 30` in `backend/src/utils/appointments.js`) rather than inferring a duration from specialty or appointment type, which isn't data the system has. Two appointments for the same physician within 30 minutes of each other are treated as conflicting. This is a reasonable default, not a clinical scheduling standard, and is called out as tunable in the code.

## 2026-10-13 — Phase 3: DOC-12 and REPORT-5 share one look-back window, applied narrowly

DOC-12 (physician access lapses without a recent appointment) and REPORT-5 (report download requires an active appointment link) are two different SRS requirements but describe the same underlying relationship test.

**Decision:** both use the same 180-day constant and the same "at least one non-cancelled appointment within the window, for this specific doctor+patient pair" query shape, rather than inventing two different lookback periods or relationship definitions that could silently drift apart. DOC-12 is applied to the doctor's own appointment list (an EXISTS-based keep/exclude per patient, preserving full history once an ongoing relationship is established); REPORT-5 is a simpler point check at download time. Neither restricts a doctor's access to an appointment they are *currently, directly* assigned to (`POST /prescribe`, `PATCH /review`) -- those already require the appointment's own `doctor_id` to match and are not time-windowed, since revoking access to an appointment the doctor is actively handling isn't what either requirement asks for.

## 2026-10-13 — Phase 3: caregiver share list never re-exposes the raw token

CARE-4 asks for a list of a patient's share links. The raw token is a bearer credential -- anyone holding it can view the shared summary with no further authentication.

**Decision:** `GET /api/caregiver/shares` returns `token_suffix` (last 8 characters) instead of the full token, enough for the patient to recognize which link is which (matching against what they already copied/sent) without the list endpoint becoming a second way to retrieve a live credential. The full token is only ever returned once, at generation time, consistent with how refresh tokens and other secrets are handled throughout this codebase.

## 2026-10-13 — Phase 3: APPT-9 counterpart notification reuses the dev mail outbox, not push

APPT-9 requires notifying the counterpart (patient or physician) on cancellation/reschedule. Push notifications (the system's only other live notification channel) are wired to patient accounts via `push_subscriptions`, keyed by `user_id` -- there is no equivalent subscription mechanism for physicians.

**Decision:** used the existing `mailService` (dev outbox locally, a real provider required in production -- see the AUTH-14 decision above) for both directions, rather than building a doctor-side push subscription system or treating patient and physician notifications through two different channels. This is deliberately the same infrastructure Phase 1's password-reset email uses, so there is exactly one "send mail" seam in the codebase, not several.

## 2026-10-13 — Phase 2: model version is a timestamp, not a registry entry

NLP-8 asks for a model version stored with every prediction. The ML service has no model registry yet (ADMIN-13..15, which govern versioned activation/rollback, are explicitly Phase 4 scope).

**Decision:** used the simplest thing that is still a genuine, distinguishing version identifier: a timestamp captured at train time (`disease-model-<ISO timestamp>`) for the disease model, and at process-start time (`symptom-extractor-<ISO timestamp>`) for the extractor, which has no retrain endpoint at all. This answers "which model produced this result" correctly today without building registry infrastructure a quarter of the way through the brief's own phase sequence that is explicitly supposed to build it later. When Phase 4 adds the real registry, these timestamps become the natural version keys already in use.

## 2026-10-13 — Phase 2: low-confidence threshold (0.3) is a documented guess, not a calibrated number

NLP-9 requires flagging low-confidence disease predictions. No target precision/recall tradeoff was specified anywhere in the SRS or brief.

**Decision:** picked 0.3 as a deliberately conservative floor (roughly 7-8x better than the ~0.04 a uniform random guess would score across 24 classes), documented inline in `disease_model.py` as a named, tunable constant (`LOW_CONFIDENCE_THRESHOLD`) rather than a bare literal, so adjusting it later is a one-line change with an obvious place to make it, not a buried magic number.

## 2026-10-13 — Phase 2: ENTRY-8's body-region vocabulary is new reference data, body_location is untouched

The existing `body_location` column is free text (populated by NLP extraction or typed by the patient) and has real historical data in it already. ENTRY-8 asks for a *structured* region selectable from a front/back body map.

**Decision:** added `body_region_code` as a new, separate, optional column validated against a fixed 22-entry enum (`backend/src/utils/bodyRegions.js`), rather than trying to retrofit `body_location` into a controlled vocabulary (which would have broken every existing entry's data and the NLP extractor's free-text output). The enum is exposed at `GET /api/symptoms/body-regions` for the Phase 5 body-map component to consume directly.

## 2026-10-13 — Phase 1: AUDIT-2 scope is representative, not exhaustive

AUDIT-2 says a physician or administrator accessing a specific patient's data should be logged. The system has many such read paths (every doctor/admin endpoint that touches patient rows). Logging all of them in this phase would mean touching nearly every route file a second time.

**Decision:** implemented AUDIT-2 on the two highest-value, highest-traffic paths — a doctor's own appointment list (one row per patient viewed) and admin's system-wide appointment list (one summary row per request, not per returned row, since that view can return many rows and a per-row log would flood the table for a bulk administrative action). Every other cross-ownership read path is a known, tracked gap rather than a silent one — `docs/GAP_ANALYSIS.md` and `docs/TRACEABILITY.csv` both say so explicitly rather than claiming AUDIT-2 as fully done.

## 2026-10-13 — Phase 1: mail service has a real dev outbox but no wired production transport

AUTH-14 asks for a dev outbox and says production "requires a real SMTP/API provider." No specific provider (SMTP via nodemailer, SendGrid, Postmark, SES, etc.) was named anywhere in the brief or the SRS.

**Decision:** `src/services/mailService.js` fully implements the development path (captures to `backend/data/mail-outbox.json`) and defines the production contract (requires `SMTP_HOST`, throws a clear error otherwise) but does not hard-wire a specific vendor SDK — picking one is a product/infra decision (cost, deliverability, existing vendor relationships) that belongs to whoever actually runs this in production, not to an unprompted dependency choice made here. The seam is intentionally one function (`sendMail`) so wiring in a real provider later is a single, isolated change.

## 2026-10-13 — Phase 1: file downloads changed from `<a href>` to an authenticated blob fetch

SEC-16 requires attachments and reports to be served only through an authenticated, ownership-checked route. The frontend's existing download links were plain `<a href="{static-url}">` tags — a browser anchor navigation cannot carry the `Authorization: Bearer` header the rest of the app uses for auth, so simply pointing the same anchor at the new authenticated route would have silently broken every download (401, every time).

**Decision:** added `openAuthenticatedFile()` to `frontend/src/api/client.js`, which fetches the file through the existing authenticated axios client (`responseType: 'blob'`) and opens it via a `blob:` object URL. Updated the three call sites (`History.jsx` attachment list, `Reports.jsx` latest-report banner and report-history list) from `<a>` to `<button onClick=...>`. This is a minimal, necessary fix to keep downloads working through the security fix, not a start on the Phase 5 frontend redesign.

## 2026-10-13 — Phase 1: CSP is two independent policies, not one

The brief's Phase 1 bullet says "Content-Security-Policy and other headers served by nginx." The backend already had an opt-in CSP via Helmet (off by default). These are not the same protection: the browser only enforces whichever CSP header arrived with the HTML *document* response. The React SPA's document is served by nginx (production) or Vite's dev server (development) — never by the Express backend, which only returns JSON except at `/api/docs` (Swagger UI).

**Decision:** implemented two separate, independently-scoped policies: nginx now sends a CSP tailored to the SPA (`frontend/nginx.conf`), and the backend's own CSP (now on by default rather than opt-in) covers only what it actually serves — its JSON API and `/api/docs`. Both allow `style-src 'unsafe-inline'`: the SPA for React's `style={{...}}` prop (which compiles to inline `style=""` attributes), the backend for Swagger UI's injected styles. Eliminating that allowance needs a nonce-per-render scheme on the frontend, which remains documented future work (consistent with the v1.0 SRS's own note that a fully strict CSP needs a policy "written specifically for this application's current script and style usage").

## 2026-10-13 — Phase 0: discovered and fixed a real `docker compose up --build` failure

Verifying DEPLOY-11 by actually running `docker compose up --build` (not just trusting the compose file) surfaced a genuine pre-existing bug: neither `backend/` nor `frontend/` had a `.dockerignore`. Both Dockerfiles do `RUN npm ci` followed by `COPY . .` — with no `.dockerignore`, that second `COPY` overwrote the container's freshly-installed `node_modules` (built for Linux inside the container) with the host's Windows-built `node_modules`. The backend then crash-looped on boot with `Error loading shared library .../better_sqlite3.node: Exec format error` — a native-binding architecture mismatch.

**Decision:** added `backend/.dockerignore`, `frontend/.dockerignore`, and `ml_service/.dockerignore` (the last as a preventive measure; it hit no equivalent bug) excluding `node_modules`, `.env`, build output, and VCS metadata. Re-ran `docker compose up --build` end to end afterward: all three containers reached `(healthy)`, and `GET /api/ready` through the nginx-proxied frontend confirmed the backend could reach both the database and the ML microservice. This is exactly the kind of gap the completion brief's "actually run it and confirm" instruction (and DEPLOY-11) exists to catch — recorded here because it was a correctness bug, not a style choice, and it predates this phase's own changes.

## 2026-10-13 — Pagination keeps each route's existing named key instead of a generic `items` field

The SRS (API-3) describes a pagination envelope as `{ items, total, limit, offset }`. Every existing list endpoint already returns `{ <resourceName>: [...] }` (e.g. `{ entries: [...] }`, `{ medications: [...] }`), and ~15 frontend call sites read that exact key.

**Decision:** `src/utils/pagination.js`'s `paginatedResponse(resourceKey, rows, total, { limit, offset })` keeps the existing named key and adds `total`/`limit`/`offset` as sibling fields, rather than renaming every key to `items`. This satisfies the spec's intent (every list response now carries real pagination metadata — previously even the one endpoint that accepted `limit`/`offset` didn't return a true `total`) without a frontend-wide rename that a zero-test codebase can't safely absorb in one pass. The `/api/reminders` endpoint also raises its default/max page size (200/500 instead of 20/50) because the in-tab alarm poller and background scheduler depend on seeing every active reminder, not a silently-truncated first page — a blanket default would have been a functional regression disguised as a compliance fix.

## 2026-10-13 — Error envelope rollout via codemod, frontend updated to match

API-1 requires `{ error: { code, message, details } }`. The codebase had 137 existing `res.status(N).json({ error: '...' })` call sites across 15 files, all following the same simple-string pattern except two template-literal cases. A scripted regex codemod converted 130 of them to `sendError(res, N, '...')` (preserving exact message text), and the 2 template-literal + 5 edge cases were fixed by hand after the codemod reported them unmatched.

**Decision:** since this changes `error` from a string to an object, the ~15 frontend call sites reading `err.response?.data?.error` as display text were updated in the same commit to `err.response?.data?.error?.message` — splitting this across two phases would have left the frontend silently broken (React would try to render an object) for however long the gap lasted. Verified via `npm run build` (frontend) and `npm test` + manual curl checks (backend) rather than by inspection alone.

## 2026-10-13 — ml_service formatting applied, frontend's deferred

Ran `ruff --fix` and `black` on `ml_service/` (6 files reformatted/fixed: unused imports, import order, line length). Verified behaviorally unchanged by re-running `/predict-disease` and `/extract` before and after with the same input and diffing the output byte-for-byte — identical.

**Decision:** did not run `prettier --write` on `frontend/src` even though the config now exists there, because Phase 5 of the brief replaces the entire frontend; reformatting ~30 files now just to have them rewritten shortly is wasted diff noise. Prettier *was* applied to `backend/src` (33 files) since the backend is being extended, not replaced, and Prettier's formatting-only guarantee made this safe to verify by syntax-check + full test pass rather than a line-by-line diff review.

## 2026-10-13 — Repository had no git history

`git status` on `C:\Users\anubh\Desktop\SWE_project` reported "not a git repository." The brief requires "one git commit" after each phase.

**Decision:** ran `git init` and added a `.gitignore` (node_modules, `__pycache__`, `.env`, uploads/data directories, build output, screenshots) before the first commit, so the initial commit establishes a clean baseline rather than committing generated/runtime artifacts.
