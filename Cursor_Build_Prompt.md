# Cursor Build Prompt — Symptom Tracker System

Paste everything below into Cursor's chat/composer, with `Symptom_Tracker_PRD.md`
attached/open in the workspace so Cursor can reference it directly.

---

## Instructions to Cursor

You are building a complete, working full-stack web application called the
**Symptom Tracker System** inside this project folder. A full Product
Requirements Document is attached as `Symptom_Tracker_PRD.md` — read it
fully before writing any code. It contains the problem statement, user
stories, functional requirements (FR IDs), the exact data schema, the
complete API reference, and the exact tech stack with pinned versions.
Treat Section 9A of that PRD ("Technical Specification") as authoritative
for implementation details — don't deviate from the schema, endpoint list,
or stack versions specified there unless you hit a concrete technical
blocker, in which case tell me what and why before switching.

### Build this in order, verifying each phase actually runs before moving to the next:

**Phase 1 — Backend foundation**
1. Scaffold a FastAPI project at `backend/` using the exact dependency
   versions listed in PRD Section 9A.1. Pin `bcrypt==4.0.1` explicitly —
   passlib 1.7.4 (also pinned) breaks silently on bcrypt>=4.1, so don't let
   pip resolve a newer bcrypt automatically.
2. Implement all 11 SQLAlchemy models exactly as specified in PRD Section
   9A.3 (Complete data schema), including every field, type, and
   nullability. Use a portable UUID column type (native `UUID` on
   PostgreSQL, `CHAR(36)` fallback on SQLite via a custom `TypeDecorator`)
   so the same models can be smoke-tested on SQLite without a live Postgres
   server, while production still targets PostgreSQL as specified.
3. Implement JWT + bcrypt authentication (register/login), with ownership-
   scoped access on every protected route (a user can only see/modify their
   own data).
4. Implement every endpoint listed in PRD Section 9A.2 (Complete API
   reference) — don't skip any, don't rename paths. Match the HTTP methods,
   auth requirements, and query parameters exactly as listed.
5. Build the Classification Engine as a mocked service (severity-based
   rules producing type/recommendation/reasoning/confidence) with retry
   logic on failure, structured so `_call_remote_engine`-equivalent logic
   can later be swapped for a real HTTP call without touching calling code.
6. Write a `seed.py` script that populates the Symptoms catalogue (10-15
   common symptoms with categories) and a few sample Doctors.
7. **Verify this phase actually works** before moving on: run the backend
   with `DATABASE_URL` pointed at SQLite, and use FastAPI's TestClient (or
   just hit the endpoints with curl/httpie) to confirm register → login →
   log a symptom entry → see it auto-classified → fetch history all work
   end to end. Fix anything broken before Phase 2.

**Phase 2 — Frontend foundation**
1. Scaffold a React + Vite project at `frontend/` using the exact versions
   in PRD Section 9A.1.
2. Build an axios client that auto-attaches the JWT from browser storage to
   every request, and an auth context/provider wrapping the app.
3. Build pages for every user-facing feature in the PRD's Section 5 (Scope)
   and Section 7 (Functional Requirements): registration, login, symptom
   entry logging (with file attachment + immediate classification display),
   filterable symptom history, reminders (CRUD), medications (CRUD),
   appointments (schedule + list, doctor/classification dropdowns), reports
   (generate by date range + download), and inline feedback on each
   classification result (helpful/not helpful + comment).
4. Wire up routing (protected routes redirect to login if not authenticated)
   and a nav bar linking every page.
5. **Verify this phase actually works**: run `npm run build` and confirm it
   compiles with zero errors, then run `npm run dev` and manually click
   through every page against the Phase 1 backend to confirm the full user
   flow works in a real browser — this is something I was not able to
   verify myself, so don't skip it.

**Phase 3 — Deployment & polish**
1. Write Dockerfiles for both backend (slim Python base) and frontend
   (multi-stage Node build → nginx serve), plus a `docker-compose.yml`
   wiring up PostgreSQL + backend + frontend together with named volumes
   for the database and for uploaded files/reports.
2. **Actually run `docker compose up --build` and confirm all three
   services start and can talk to each other** — this is the part I could
   not verify myself, so treat it as a hard requirement, not optional
   polish. Fix CORS origins, environment variables, and build args
   (`VITE_API_URL`) as needed until it works end to end in Docker.
3. Set up a GitHub Actions CI workflow that runs backend tests and frontend
   build checks on every push/PR.
4. Add a `README.md` with clear local dev and Docker setup instructions.

### Known gaps from the PRD to address or explicitly leave as documented decisions:
- **Doctor authentication is missing** in the reference design (doctor-
  facing endpoints have no auth guard). Either implement real doctor login
  mirroring the User auth pattern, or clearly document in your final
  summary that this remains a known limitation — don't silently leave it
  unaddressed without telling me.
- File uploads currently have no size limit or content-type validation in
  the reference design — add reasonable limits (e.g. 10MB, image/PDF only)
  since this is an easy, worthwhile fix.
- Add basic rate limiting on `/auth/login` to reduce brute-force risk, since
  this wasn't in the original reference build either.

### What "done" looks like
- Every functional requirement in the PRD (Section 7) is implemented and
  reachable through the UI, not just the API.
- `docker compose up --build` starts a fully working app from a clean
  checkout.
- You've personally exercised the full user flow in a browser (register →
  log a symptom → see classification → give feedback → book an appointment
  → generate a report) and confirmed it works, not just that the code
  compiles.
- You give me a final summary of what you built, what you tested, and any
  deviations you made from the PRD and why.

Ask me clarifying questions only if something in the PRD is genuinely
ambiguous or contradictory — otherwise, make a reasonable decision, note the
assumption, and keep building.
