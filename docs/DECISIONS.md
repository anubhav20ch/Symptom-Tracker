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

## 2026-10-13 — Repository had no git history

`git status` on `C:\Users\anubh\Desktop\SWE_project` reported "not a git repository." The brief requires "one git commit" after each phase.

**Decision:** ran `git init` and added a `.gitignore` (node_modules, `__pycache__`, `.env`, uploads/data directories, build output, screenshots) before the first commit, so the initial commit establishes a clean baseline rather than committing generated/runtime artifacts.
