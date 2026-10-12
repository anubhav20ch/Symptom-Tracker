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
