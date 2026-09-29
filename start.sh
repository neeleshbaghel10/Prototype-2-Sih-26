#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo " ============================================================"
echo "  World Monitor Guard - DevSecOps Platform"
echo "  Starting full-stack development environment..."
echo " ============================================================"
echo ""

# ── Backend Setup ─────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR/backend"

if [ ! -d ".venv" ]; then
  echo "[1/4] Creating Python virtual environment..."
  python3 -m venv .venv
fi

echo "[2/4] Installing Python dependencies..."
source .venv/bin/activate
pip install -r requirements.txt --quiet

echo "[3/4] Seeding database..."
python seed.py

# ── Frontend Setup ─────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "[4/4] Installing Node.js dependencies..."
  npm install
fi

# ── Launch Both ────────────────────────────────────────────────────────────────
echo ""
echo " Starting FastAPI on http://localhost:8000"
echo " Starting React   on http://localhost:5173"
echo ""
echo " API Docs: http://localhost:8000/docs"
echo " Demo App: http://localhost:5173"
echo " ============================================================"
echo ""

trap "kill 0" EXIT

# Backend
(cd "$SCRIPT_DIR/backend" && source .venv/bin/activate && uvicorn main:app --reload --port 8000) &

# Frontend
(cd "$SCRIPT_DIR/frontend" && npm run dev) &

wait
