@echo off
echo.
echo  ============================================================
echo   World Monitor Guard - DevSecOps Platform
echo   Starting full-stack development environment...
echo  ============================================================
echo.

:: ── Backend Setup ───────────────────────────────────────────────────────────
echo [1/4] Setting up Python virtual environment...
cd /d "%~dp0backend"

if not exist ".venv" (
    python -m venv .venv
    echo       Created .venv
)

echo [2/4] Installing Python dependencies...
call .venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

echo [3/4] Seeding database...
python seed.py

:: ── Frontend Setup ──────────────────────────────────────────────────────────
echo [4/4] Installing Node.js dependencies...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    npm install
)

:: ── Launch Both Servers ─────────────────────────────────────────────────────
echo.
echo  Starting FastAPI on http://localhost:8000
echo  Starting React   on http://localhost:5173
echo.
echo  API Docs: http://localhost:8000/docs
echo  Demo App: http://localhost:5173
echo.
echo  Press Ctrl+C to stop both servers.
echo  ============================================================
echo.

:: Start backend in a new window
start "WMG Backend (FastAPI :8000)" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: Start frontend in current window
cd /d "%~dp0frontend"
npm run dev
