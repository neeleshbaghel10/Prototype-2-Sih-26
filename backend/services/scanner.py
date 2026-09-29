"""
Mock Scanner Service
Provides a realistic OWASP Top-10 vulnerability telemetry simulation with:
- Domain whitelist enforcement
- Rate-limit guardrails
- Step-by-step SSE log generation
- Pre-built finding templates
"""

import asyncio
import random
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy.orm import Session

import models
from services.ai_triage import get_triage

# ─── Whitelist / Rate-limit State ────────────────────────────────────────────

_RATE_LIMIT_ACTIVE = True
_RATE_LIMIT_MAX_PER_HOUR = 10
_scan_count_this_hour = 0

ALLOWED_DOMAINS = {
    "localhost",
    "localhost:8000",
    "127.0.0.1",
    "127.0.0.1:8000",
    "worldmonitor.io",
    "api.worldmonitor.io",
    "demo.worldmonitor.io",
}


def check_whitelist(target_url: str, db: Session) -> bool:
    """Check if target URL is in the DB whitelist."""
    targets = db.query(models.ScopeTarget).filter_by(is_whitelisted=True).all()
    for t in targets:
        if t.target_url in target_url or target_url.startswith(t.target_url):
            return True
    # Also check built-in allowed domains
    from urllib.parse import urlparse
    parsed = urlparse(target_url)
    host = parsed.netloc or parsed.path
    return any(host == d or host.endswith("." + d) for d in ALLOWED_DOMAINS)


def check_rate_limit() -> bool:
    global _scan_count_this_hour
    if not _RATE_LIMIT_ACTIVE:
        return True
    if _scan_count_this_hour >= _RATE_LIMIT_MAX_PER_HOUR:
        return False
    _scan_count_this_hour += 1
    return True


# ─── Mock Finding Templates ───────────────────────────────────────────────────

MOCK_FINDINGS = [
    {
        "title": "Broken Object Level Authorization on Telemetry Endpoint",
        "category": "OWASP API1: BOLA",
        "severity": "HIGH",
        "endpoint": "/demo-target/v1/telemetry?user_id=102",
    },
    {
        "title": "Missing Authentication on User Listing Endpoint",
        "category": "OWASP API2: Broken Authentication",
        "severity": "CRITICAL",
        "endpoint": "/api/v1/users",
    },
    {
        "title": "Excessive PII Exposure in Profile Response",
        "category": "OWASP API3: Excessive Data Exposure",
        "severity": "MEDIUM",
        "endpoint": "/api/v1/profile",
    },
    {
        "title": "Wildcard CORS Policy and Debug Trace Exposure",
        "category": "OWASP API7: Security Misconfiguration",
        "severity": "MEDIUM",
        "endpoint": "/api (global middleware)",
    },
    {
        "title": "SQL Injection via Unparameterized Search Query",
        "category": "OWASP API8: Injection",
        "severity": "CRITICAL",
        "endpoint": "/api/v1/search?q=",
    },
]

# ─── SSE Log Lines ────────────────────────────────────────────────────────────

def _build_scan_log_lines(target_url: str) -> list[str]:
    ts = datetime.utcnow().strftime("%H:%M:%S")
    return [
        f"[{ts}] ▶  WORLD MONITOR GUARD — Scan Engine v2.4.1 (Mock Replay Mode)",
        f"[{ts}] ──────────────────────────────────────────────────────────────",
        f"[{ts}] [INIT]    Target: {target_url}",
        f"[{ts}] [INIT]    Profile: OWASP API Top-10 Full Assessment",
        f"[{ts}] [INIT]    Verifying domain whitelist... ✅ APPROVED",
        f"[{ts}] [INIT]    Rate limiter: OK (requests remaining this hour: 9)",
        f"[{ts}] [INIT]    Initializing headless HTTP client...",
        f"[{ts}] [DISCO]   Phase 1 — Endpoint Discovery",
        f"[{ts}] [DISCO]   Crawling root: {target_url}",
        f"[{ts}] [DISCO]   Found: GET /api/v1/users",
        f"[{ts}] [DISCO]   Found: GET /api/v1/profile",
        f"[{ts}] [DISCO]   Found: GET /api/v1/telemetry",
        f"[{ts}] [DISCO]   Found: GET /api/v1/search",
        f"[{ts}] [DISCO]   Found: POST /api/auth/login",
        f"[{ts}] [DISCO]   Found: GET /demo-target/v1/telemetry",
        f"[{ts}] [DISCO]   Endpoint inventory: 6 routes discovered",
        f"[{ts}] [AUTH]    Phase 2 — Authentication Surface Analysis",
        f"[{ts}] [AUTH]    Testing: POST /api/auth/login — Sending unauthenticated requests...",
        f"[{ts}] [AUTH]    ⚠️  GET /api/v1/users — 200 OK without token (FINDING QUEUED)",
        f"[{ts}] [AUTH]    ✅ POST /api/auth/login — Requires credentials",
        f"[{ts}] [BOLA]    Phase 3 — Object-Level Authorization Probing",
        f"[{ts}] [BOLA]    Probing: GET /demo-target/v1/telemetry?user_id=100",
        f"[{ts}] [BOLA]    Probing: GET /demo-target/v1/telemetry?user_id=101",
        f"[{ts}] [BOLA]    Probing: GET /demo-target/v1/telemetry?user_id=102",
        f"[{ts}] [BOLA]    ⚠️  Cross-user data returned for user_id=102 — BOLA CONFIRMED",
        f"[{ts}] [BOLA]    Raw Trace: HTTP/1.1 200 OK | Body: {{\"user_id\":102,\"email\":\"victim@corp.com\",\"api_key\":\"sk-REDACTED\"}}",
        f"[{ts}] [DATA]    Phase 4 — Excessive Data Exposure Check",
        f"[{ts}] [DATA]    GET /api/v1/profile — Response includes: password_hash, internal_flags, ssn_partial",
        f"[{ts}] [DATA]    ⚠️  PII over-exposure detected — FINDING QUEUED",
        f"[{ts}] [INJECT]  Phase 5 — Injection Testing (Read-only payloads)",
        f"[{ts}] [INJECT]  Testing: GET /api/v1/search?q=' OR '1'='1",
        f"[{ts}] [INJECT]  ⚠️  504 rows returned (expected <10) — SQL Injection CONFIRMED",
        f"[{ts}] [CONFIG]  Phase 6 — Security Configuration Audit",
        f"[{ts}] [CONFIG]  CORS: Access-Control-Allow-Origin: * (wildcard — INSECURE)",
        f"[{ts}] [CONFIG]  X-Frame-Options: MISSING",
        f"[{ts}] [CONFIG]  Content-Security-Policy: MISSING",
        f"[{ts}] [CONFIG]  ⚠️  Security misconfiguration — FINDING QUEUED",
        f"[{ts}] [DONE]   ──────────────────────────────────────────────────────────────",
        f"[{ts}] [DONE]   Assessment Complete",
        f"[{ts}] [DONE]   Findings: 5 total | CRITICAL: 2 | HIGH: 1 | MEDIUM: 2",
        f"[{ts}] [DONE]   Risk Score: 8.4 / 10.0",
        f"[{ts}] [DONE]   Running AI triage pipeline...",
        f"[{ts}] [AI]     Generating CVSS vectors and remediation patches...",
        f"[{ts}] [AI]     Root cause analysis complete for 5 findings",
        f"[{ts}] [DONE]   ✅ Scan persisted — view findings in the dashboard",
    ]


# ─── Core Scanner Functions ───────────────────────────────────────────────────

async def run_mock_scan(scan_id: int, target_url: str, db: Session):
    """
    Runs the mock scan, updating progress in the DB and persisting findings.
    Called as a background task from the scan launch endpoint.
    """
    scan = db.query(models.ScanJob).filter_by(id=scan_id).first()
    if not scan:
        return

    scan.status = "running"
    db.commit()

    total_steps = 10
    for step in range(1, total_steps + 1):
        await asyncio.sleep(0.8)
        scan.progress_percentage = round((step / total_steps) * 100, 1)
        db.commit()

    # Persist findings
    for tmpl in MOCK_FINDINGS:
        triage = get_triage(tmpl["category"], tmpl["title"], "mock-trace")
        raw_trace = (
            f"HTTP GET {target_url}{tmpl['endpoint']} → 200 OK\n"
            f"Response contains unauthorized data. Category: {tmpl['category']}."
        )
        finding = models.Finding(
            scan_id=scan_id,
            title=tmpl["title"],
            category=tmpl["category"],
            severity=tmpl["severity"],
            cvss_score=triage["cvss_score"],
            cvss_vector=triage["cvss_vector"],
            endpoint=tmpl["endpoint"],
            raw_trace=raw_trace,
            root_cause=triage["root_cause"],
            suggested_patch=triage["suggested_patch"],
            vulnerable_code=triage.get("vulnerable_code", ""),
            patched_code=triage.get("patched_code", ""),
            status="pending_review",
        )
        db.add(finding)

    scan.status = "completed"
    scan.completed_at = datetime.utcnow()
    scan.progress_percentage = 100.0
    db.commit()


async def stream_scan_logs(scan_id: int, target_url: str) -> AsyncGenerator[str, None]:
    """
    Yields SSE-formatted log lines for the given scan.
    """
    lines = _build_scan_log_lines(target_url)
    for i, line in enumerate(lines):
        await asyncio.sleep(0.35)
        yield f"data: {line}\n\n"
    yield "data: [STREAM_END]\n\n"
