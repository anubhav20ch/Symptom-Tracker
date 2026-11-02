<div align="center">

# 🩺 SymptomLog

### Intelligent Personal Symptom Tracker, Medication Alarm & Doctor–Patient Management Platform

[![CI](https://github.com/anubhav20ch/Symptom-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/anubhav20ch/Symptom-Tracker/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688?logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

**BCSE301L Software Engineering Project — Fall 2026**
Anubhav Choudhary (24BYB1090) · Avneesh Poorbia (24AI1090)
VIT Chennai

> ⚕️ **Medical Disclaimer:** SymptomLog is a personal health-logging aid only.
> All ML predictions and triage results are advisory and non-diagnostic.
> Always consult a licensed medical professional for clinical decisions.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start — Local Dev](#-quick-start--local-dev)
- [Quick Start — Docker Compose](#-quick-start--docker-compose)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [ML Microservice](#-ml-microservice)
- [Running Tests](#-running-tests)
- [CI / CD](#-ci--cd)
- [Demo Credentials](#-demo-credentials)
- [Known Limitations](#-known-limitations)
- [Authors](#-authors)

---

## 🌟 Overview

SymptomLog transforms informal, memory-based symptom reporting into a **structured, longitudinal clinical record**. Patients log symptoms in plain language; the platform automatically extracts attributes via NLP, predicts likely conditions across **24 disease categories (~97% holdout accuracy)**, classifies urgency using a **four-tier deterministic triage engine**, and generates a printable PDF clinical summary — all within a privacy-first, self-hosted stack.

Three role-separated portals are served from a single Docker Compose stack:

| Portal | Who uses it |
|---|---|
| **Patient** | Log symptoms, manage medications & alarms, book appointments, view trends & reports |
| **Physician** | Review appointments, add clinical notes, issue prescriptions |
| **Administrator** | Manage physician accounts, upload ML training datasets, trigger model retraining |

---

## ✨ Key Features

- **🔍 NLP-Assisted Symptom Entry** — type in plain language; the ML service extracts symptom name, body location, severity, and triggers automatically
- **🤖 Disease Prediction** — 24-condition classifier with ranked confidence scores and explicit medical disclaimer
- **🚦 Four-Tier Triage Engine** — deterministic, inspectable rules classify every entry as Self-Care / Pharmacist / GP / Emergency
- **💊 Dual-Layer Medication Alarms** — in-tab sound alarm + background Web Push notification; server-side dose-log adherence record
- **🗓️ Appointment Booking** — book against a live physician directory linked to symptom entries; double-booking prevented
- **📄 PDF Clinical Reports** — SHA-256 integrity-verified clinical summaries for any date range
- **👨‍👩‍👧 Caregiver Sharing** — time-limited, revocable read-only share links (no account required)
- **📊 Insights & Trends** — filterable history table + 7-day severity trend chart with medication markers
- **🔒 Defense-in-Depth Security** — bcrypt, rotating HttpOnly refresh tokens, CSRF, Helmet CSP, audit logging, rate limiting
- **♿ WCAG 2.1 AA Accessibility** — keyboard navigability, screen-reader announcements, focus rings, color-independent severity
- **🌙 Dark / Light Mode** — persisted per-user preference
- **🐳 One-Command Deployment** — `docker compose up --build` starts all three services with health checks

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT BROWSER                          │
│          React 19 + Vite SPA  (nginx in production)          │
│   Patient Portal  │  Physician Portal  │  Admin Portal        │
└──────────────────────────┬───────────────────────────────────┘
                           │  REST / JSON
                           ▼
┌──────────────────────────────────────────────────────────────┐
│               BACKEND API   Node.js + Express                │
│  Auth · Entries · Triage · Reports · Reminders · Caregiver  │
│  JWT rotation · Alarm scheduler · PDF generator · Audit log  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │   Dual-mode DB layer:  PostgreSQL  ↔  SQLite         │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │  HTTP (internal Docker network)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│           ML MICROSERVICE   Python 3.11 + FastAPI            │
│  NLP Extractor · Disease Classifier · Numerical Classifier   │
│  Model Registry · Async Retraining Jobs                      │
└──────────────────────────────────────────────────────────────┘
```

**Design decisions:**
- The ML microservice failure degrades gracefully — the backend falls back to keyword-extraction heuristics automatically with no patient-facing error.
- A single SQL query layer is rewritten at runtime for PostgreSQL (prod) or SQLite (dev) — no forked schemas.
- nginx proxies `/api/` and `/uploads/` in production, eliminating CORS issues and making cookie same-site guarantees work correctly.

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite | 19.2.8 / 8.3.0 |
| Routing | React Router | 7.18.4 |
| HTTP Client | Axios | 1.20.0 |
| Icons | Lucide React | 1.51.0 |
| Fonts (self-hosted) | Source Sans 3, Source Serif 4, IBM Plex Mono | @fontsource 5.x |
| Backend | Node.js + Express | 20 LTS / 4.21.2 |
| Auth | jsonwebtoken + bcryptjs | 9.0.2 + 2.4.3 |
| Database (prod) | PostgreSQL | via `pg` 8.13.3 |
| Database (dev) | SQLite | via `better-sqlite3` 11.8.1 |
| PDF | PDFKit | 0.16.0 |
| Push notifications | web-push (VAPID) | 3.6.7 |
| ML runtime | Python + scikit-learn classifiers | 3.11 |
| ML API | FastAPI + Uvicorn | latest stable |
| Containerization | Docker Compose | format 3.8 |
| CI/CD | GitHub Actions | — |
| API Docs | OpenAPI 3.0 + Swagger UI | at `/api/docs` |

---

## 🚀 Quick Start — Local Dev

> **Prerequisites:** Node.js 20 LTS, Python 3.11, Git

```bash
# 1 — Clone
git clone https://github.com/anubhav20ch/Symptom-Tracker.git
cd Symptom-Tracker
```

### Backend (terminal 1)

```bash
cd backend
cp .env.example .env
# Open .env and set:
#   JWT_SECRET=<any-random-string-32+-chars>
# Everything else defaults to SQLite for local dev.

npm install
npm run migrate   # applies all 14 SQL migrations
npm run seed      # seeds symptom catalogue + demo accounts
npm run dev       # → http://localhost:5000
```

### ML Microservice (terminal 2)

```bash
cd ml_service
pip install -r requirements.txt
python main.py    # FastAPI → http://localhost:8001
# Swagger UI at http://localhost:8001/docs
```

### Frontend (terminal 3)

```bash
cd frontend
npm install
npm run dev       # Vite → http://localhost:5173
```

Open **http://localhost:5173** — see [Demo Credentials](#-demo-credentials) to log in.

---

## 🐳 Quick Start — Docker Compose

> **Prerequisites:** Docker Desktop (or Docker Engine + Compose plugin)

```bash
# 1 — Clone
git clone https://github.com/anubhav20ch/Symptom-Tracker.git
cd Symptom-Tracker

# 2 — Set the one required secret
cp backend/.env.example backend/.env
# Edit backend/.env → set JWT_SECRET to any 32+ character random string

# 3 — Build & start all three services
docker compose up --build
```

Wait for all health checks to pass (~30–60 s), then open **http://localhost:5173**.

| Service | Internal port | Exposed port |
|---|---|---|
| Frontend (nginx) | 8080 | **5173** |
| Backend API | 5000 | 5000 |
| ML Microservice | 8001 | 8001 |

To stop: `docker compose down`
To stop and remove volumes: `docker compose down -v`

---

## 📁 Project Structure

```
Symptom-Tracker/
├── frontend/                  # React 19 + Vite SPA
│   ├── src/
│   │   ├── pages/             # 20+ page components
│   │   ├── components/        # Layout, Sidebar, Navbar, etc.
│   │   ├── context/           # AuthContext
│   │   ├── api/               # Axios client with JWT interceptor
│   │   └── __tests__/         # Component smoke tests
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/                   # Node.js + Express REST API
│   ├── src/
│   │   ├── routes/            # 15 route modules
│   │   ├── services/          # classificationEngine, pdfService, reminderScheduler…
│   │   ├── middleware/        # auth, csrf, rateLimit, upload, validate…
│   │   ├── db/
│   │   │   ├── migrations/    # 14 versioned SQL files + down scripts
│   │   │   ├── migrate.js
│   │   │   └── seed.js
│   │   ├── docs/openapi.yaml  # Full OpenAPI 3.0 spec
│   │   └── index.js
│   ├── tests/
│   │   └── e2eSmoke.test.js   # End-to-end smoke suite
│   └── Dockerfile
│
├── ml_service/                # Python 3.11 + FastAPI ML microservice
│   ├── main.py                # All endpoints: /extract, /predict-disease, /smart-analyze…
│   ├── model.py               # NLP symptom extractor
│   ├── disease_model.py       # 24-condition disease classifier
│   ├── numerical_model.py     # Biomarker-based numerical classifier
│   ├── model_registry.py      # Version tracking + metrics-gated activation
│   ├── jobs.py                # Async retraining job runner
│   ├── dataset.py             # Canonical symptom dictionary
│   ├── data/
│   │   └── Symptom2Disease.csv  # Training dataset (41 k rows)
│   └── Dockerfile
│
├── docs/
│   ├── DESIGN.md              # Clinical design system & component standards
│   └── RUNBOOK.md             # Operational runbook (backup, DR, ML lifecycle)
│
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── docker-compose.yml
├── SymptomLog_SRS_v1.1.docx   # Software Requirements Specification
└── README.md
```

---

## 📖 API Documentation

Interactive Swagger UI is served at **`http://localhost:5000/api/docs`** when the backend is running.

Key endpoint groups:

| Prefix | Description |
|---|---|
| `POST /api/auth/register` | Patient registration |
| `POST /api/auth/login` | Login → JWT + refresh cookie |
| `POST /api/auth/refresh` | Silent token rotation |
| `GET/POST /api/entries` | Symptom entry CRUD (auto-classifies on create) |
| `GET /api/insights` | Dashboard stats, trend data, adherence gauge |
| `GET/POST /api/medications` | Medication CRUD |
| `GET/POST /api/reminders` | Reminder CRUD + dose-log |
| `GET/POST /api/appointments` | Appointment booking |
| `POST /api/reports` | Generate PDF clinical summary |
| `GET /api/reports/:id/file` | Authenticated, integrity-checked download |
| `POST /api/caregiver/share` | Create time-limited read-only share link |
| `GET/POST /api/doctor/*` | Physician portal endpoints |
| `GET/POST /api/admin/*` | Admin portal: physician mgmt + ML lifecycle |
| `GET /api/health` | Liveness probe (always 200 while process is up) |
| `GET /api/ready` | Readiness probe (checks DB + ML service) |

---

## 🤖 ML Microservice

The Python FastAPI service runs independently on port **8001**.

| Endpoint | Description |
|---|---|
| `POST /extract` | NLP symptom attribute extraction from free text |
| `POST /predict-disease` | 24-condition disease prediction with confidence scores |
| `POST /numerical/classify` | Biomarker-based triage signal (emotion, pain, energy…) |
| `POST /smart-analyze` | Combined end-to-end analysis (NLP + disease + numerical) |
| `GET /health` | Model health + holdout accuracy |
| `GET /diseases` | Full list of supported disease classes |
| `GET /dictionary` | Canonical symptom dictionary |
| `POST /retrain` | Trigger async retraining (returns job ID immediately) |
| `GET /retrain/{job_id}` | Poll retraining job status |
| `GET /models` | Model version history |
| `POST /models/activate` | Activate a version (quality gate: accuracy ≥ 80%, F1 ≥ 75%) |
| `POST /models/rollback` | Roll back to a previous active version |

Current model performance:

| Model | Dataset | Holdout Accuracy |
|---|---|---|
| Disease Classifier | Symptom2Disease (24 classes) | ~97% |
| Numerical Classifier | Clinical biomarkers | Varies by cohort |

---

## 🧪 Running Tests

### Backend

```bash
cd backend
npm test              # Jest unit + integration tests
npm run lint          # ESLint
npm audit --audit-level=high
```

### Frontend

```bash
cd frontend
npm test              # Node.js built-in test runner (component smoke tests)
npm run lint          # oxlint
npm run build         # Production build + bundle budget check
```

### ML Service

```bash
cd ml_service
pip install -r requirements-dev.txt
pytest --no-header -q              # Disease model accuracy + registry tests
ruff check .                       # Linting
black --check .                    # Formatting
```

### End-to-End Smoke

```bash
cd backend
# Requires backend + ML service running on their default ports
npx jest tests/e2eSmoke.test.js
```

---

## ⚙️ CI / CD

GitHub Actions runs four jobs on every push and pull request (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

```
Backend  ──────────────────────────┐
Frontend ──────────────────────────┼──► Docker Compose health gate
ML Service ────────────────────────┘    (all containers must reach "healthy")
```

| Job | Steps |
|---|---|
| **Backend** | `npm ci` → lint → test → `npm audit --audit-level=high` |
| **Frontend** | `npm ci` → lint → `npm run build` → `npm audit --audit-level=high` |
| **ML Service** | `pip install` → ruff → black → pytest → pip-audit |
| **Docker health gate** | `docker compose up --build -d` → wait for all services healthy → tear down |

---

## 🔑 Demo Credentials

See [`DEMO_CREDENTIALS.md`](DEMO_CREDENTIALS.md) for seed account details.

> ⚠️ Change or remove demo accounts before any use beyond local evaluation.

After cloning, run `npm run seed` in the `backend/` directory to create them.

---

## ⚠️ Known Limitations

| Limitation | Detail |
|---|---|
| **No HTTPS** | TLS termination is not configured. Do not expose to the public internet without adding HTTPS (e.g., nginx + Let's Encrypt). |
| **SQLite in Docker** | The Docker Compose stack uses SQLite by default. For production, point `DATABASE_URL` at a PostgreSQL instance. |
| **Background push on iOS** | Web Push is available on iOS Safari 16.4+ only when the app is added to the Home Screen. |
| **Email delivery** | In dev mode, password-recovery emails are written to `backend/data/mail-outbox.json` and the server log instead of being sent. Configure `SMTP_*` env vars for real delivery. |
| **Single-operator deployment** | Not verified for multi-tenant public hosting. |

---

## 👥 Authors

| Name | Reg. No. | Role |
|---|---|---|
| **Anubhav Choudhary** | 24BYB1090 | Full-stack architecture, backend API, ML microservice, DevOps |
| **Avneesh Poorbia** | 24AI1090 | Frontend design system, SRS documentation, testing |

**Supervisor:** Dr. Softya Sebastian, Assistant Professor, SCOPE — VIT Chennai

---

<div align="center">

Made with ❤️ for BCSE301L Software Engineering — VIT Chennai, Fall 2026

</div>
