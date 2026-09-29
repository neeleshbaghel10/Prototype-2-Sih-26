# World Monitor Guard 🛡️

**Production-grade DevSecOps & API Security Evaluation Platform**

A full-stack prototype featuring RBAC, automated OWASP API Top-10 scanning, AI-powered triage, and a developer remediation lifecycle.

---

## Quick Start (Windows)

```bat
start.bat
```

This will automatically:
1. Create a Python virtual environment
2. Install all dependencies
3. Seed the database with demo data
4. Launch FastAPI on **http://localhost:8000**
5. Launch React on **http://localhost:5173**

## Quick Start (macOS / Linux)

```bash
chmod +x start.sh && ./start.sh
```

---

## Manual Setup

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python seed.py                          # Populate demo data
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                             # Starts on port 5173
```

---

## Access Points

| Service | URL |
|---|---|
| Demo App | http://localhost:5173 |
| FastAPI Docs (Swagger) | http://localhost:8000/docs |
| API Health | http://localhost:8000/api/health |
| Vulnerable Demo Endpoint | http://localhost:8000/demo-target/v1/telemetry?user_id=102 |

---

## Architecture

```
Prototye S/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLAlchemy + SQLite
│   ├── models.py            # ORM: User, ScanJob, Finding, RetestLog...
│   ├── schemas.py           # Pydantic v2 schemas
│   ├── seed.py              # Demo data seeder
│   ├── routers/
│   │   ├── auth.py          # POST /api/auth/switch-role
│   │   ├── admin.py         # Whitelist, audit logs, health
│   │   ├── analyst.py       # Scans, SSE stream, triage, reports
│   │   ├── developer.py     # Tickets, re-test
│   │   └── demo.py          # Intentionally vulnerable BOLA endpoint
│   └── services/
│       ├── scanner.py       # Mock OWASP scan engine + SSE log generator
│       └── ai_triage.py     # CVSS scoring + code diff knowledge base
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Role routing + health check
│   │   ├── api/client.js    # Axios client
│   │   ├── components/
│   │   │   ├── NavBar.jsx          # Role switcher
│   │   │   ├── FindingCard.jsx     # Severity + CVSS + triage buttons
│   │   │   ├── TerminalViewer.jsx  # SSE live log viewer
│   │   │   ├── CodeDiff.jsx        # Side-by-side patch viewer
│   │   │   └── ExecutiveReport.jsx # Printable compliance report
│   │   └── views/
│   │       ├── AdminView.jsx       # Whitelist, guardrails, audit logs
│   │       ├── AnalystView.jsx     # Scan launcher, triage grid
│   │       └── DeveloperView.jsx   # Tickets, remediation, re-test
│
├── start.bat     # Windows one-command launcher
└── start.sh      # macOS/Linux one-command launcher
```

---

## RBAC Roles

| Role | Capabilities |
|---|---|
| **Admin** | Manage authorized scope targets, toggle guardrail policies, view system health and audit logs |
| **Security Analyst** | Launch scans against whitelisted targets, monitor live SSE output, triage findings, export executive reports |
| **Developer** | View confirmed security tickets, review code diffs and root cause analysis, trigger targeted re-tests |

---

## Security Features

- **Domain Whitelist**: Scans only permitted against pre-authorized targets
- **Rate Limiting**: Max 10 scans/hour guardrail
- **BOLA Demo Endpoint**: Live vulnerable endpoint at `/demo-target/v1/telemetry?user_id=102`
- **CVSS v3.1 Scoring**: Full vector strings for all OWASP API Top-10 findings
- **AI Triage**: Structured root cause, patch diff, and remediation steps per finding
- **SSE Streaming**: Real-time scanner terminal output via Server-Sent Events
- **Audit Logging**: Full action trail for all admin and analyst operations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, SQLite, Pydantic v2, SSE-Starlette |
| Frontend | React 18, Vite 5, Tailwind CSS 3, Lucide-React, Axios |
| Dev Tools | Uvicorn (ASGI), concurrently |
