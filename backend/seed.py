"""
Seed script — populates the database with hashed-password users, scope targets, scan jobs, and findings.
"""

from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
import models
from services.ai_triage import get_triage
from services.auth_service import hash_password

Base.metadata.create_all(bind=engine)


SEED_USERS = [
    {
        "username": "admin_user",
        "email": "admin@worldmonitor.io",
        "display_name": "Admin — World Monitor",
        "password": "Admin@WM2026!",
        "role": "admin",
    },
    {
        "username": "analyst_user",
        "email": "analyst@worldmonitor.io",
        "display_name": "Security Analyst",
        "password": "Analyst@WM2026!",
        "role": "analyst",
    },
    {
        "username": "developer_user",
        "email": "developer@worldmonitor.io",
        "display_name": "Developer — Remediation",
        "password": "Dev@WM2026!",
        "role": "developer",
    },
]

SEED_FINDINGS = [
    {
        "title": "Broken Object Level Authorization on Telemetry Endpoint",
        "category": "OWASP API1: BOLA",
        "severity": "HIGH",
        "endpoint": "/demo-target/v1/telemetry?user_id=102",
        "status": "confirmed",
    },
    {
        "title": "Missing Authentication on User Listing Endpoint",
        "category": "OWASP API2: Broken Authentication",
        "severity": "CRITICAL",
        "endpoint": "/api/v1/users",
        "status": "confirmed",
    },
    {
        "title": "Excessive PII Exposure in Profile Response",
        "category": "OWASP API3: Excessive Data Exposure",
        "severity": "MEDIUM",
        "endpoint": "/api/v1/profile",
        "status": "pending_review",
    },
    {
        "title": "Wildcard CORS Policy and Debug Trace Exposure",
        "category": "OWASP API7: Security Misconfiguration",
        "severity": "MEDIUM",
        "endpoint": "/api (global middleware)",
        "status": "false_positive",
    },
    {
        "title": "SQL Injection via Unparameterized Search Query",
        "category": "OWASP API8: Injection",
        "severity": "CRITICAL",
        "endpoint": "/api/v1/search?q=",
        "status": "remediated",
    },
]


def seed():
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            print("[seed] Database already seeded, skipping.")
            return

        print("[seed] Seeding database with hashed credentials...")

        # Users
        user_objs = []
        for u in SEED_USERS:
            user = models.User(
                username=u["username"],
                email=u["email"],
                display_name=u["display_name"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
            )
            db.add(user)
            user_objs.append(user)
        db.commit()

        # Scope Targets
        targets = [
            models.ScopeTarget(target_url="localhost:8000", is_whitelisted=True, created_by="admin@worldmonitor.io"),
            models.ScopeTarget(target_url="127.0.0.1:8000", is_whitelisted=True, created_by="admin@worldmonitor.io"),
            models.ScopeTarget(target_url="worldmonitor.io", is_whitelisted=True, created_by="admin@worldmonitor.io"),
            models.ScopeTarget(target_url="api.worldmonitor.io", is_whitelisted=True, created_by="admin@worldmonitor.io"),
            models.ScopeTarget(target_url="demo.worldmonitor.io", is_whitelisted=True, created_by="admin@worldmonitor.io"),
            models.ScopeTarget(target_url="evil-target.com", is_whitelisted=False, created_by="admin@worldmonitor.io"),
        ]
        db.add_all(targets)
        db.commit()

        # Completed Scan Job
        scan_completed = models.ScanJob(
            target_url="http://localhost:8000",
            scan_type="full",
            status="completed",
            progress_percentage=100.0,
            created_at=datetime.utcnow() - timedelta(hours=2),
            completed_at=datetime.utcnow() - timedelta(hours=1, minutes=45),
        )
        db.add(scan_completed)
        db.commit()
        db.refresh(scan_completed)

        for tmpl in SEED_FINDINGS:
            triage = get_triage(tmpl["category"], tmpl["title"], "seed-trace")
            raw_trace = (
                f"HTTP GET http://localhost:8000{tmpl['endpoint']} => 200 OK\n"
                f"Response contains unauthorized data. Category: {tmpl['category']}."
            )
            finding = models.Finding(
                scan_id=scan_completed.id,
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
                status=tmpl["status"],
            )
            db.add(finding)
        db.commit()

        # Retest log for remediated finding
        remediated = db.query(models.Finding).filter_by(status="remediated").first()
        if remediated:
            db.add(models.RetestLog(
                finding_id=remediated.id,
                status="passed",
                execution_timestamp=datetime.utcnow() - timedelta(minutes=30),
                notes="Patch verified — endpoint now returns 401 for unauthenticated requests.",
            ))
            db.commit()

        # Second scan
        scan2 = models.ScanJob(
            target_url="http://api.worldmonitor.io",
            scan_type="quick",
            status="completed",
            progress_percentage=100.0,
            created_at=datetime.utcnow() - timedelta(minutes=15),
            completed_at=datetime.utcnow() - timedelta(minutes=5),
        )
        db.add(scan2)
        db.commit()

        # Audit logs
        audit_events = [
            ("SYSTEM_STARTUP", "system", "World Monitor Guard initialized"),
            ("ADD_TARGET", "admin@worldmonitor.io", "Added target: worldmonitor.io"),
            ("ADD_TARGET", "admin@worldmonitor.io", "Added target: localhost:8000"),
            ("SCAN_LAUNCHED", "analyst@worldmonitor.io", f"Scan #{scan_completed.id} launched on http://localhost:8000"),
            ("SCAN_COMPLETED", "system", f"Scan #{scan_completed.id} completed — 5 findings"),
            ("TRIAGE_DECISION", "analyst@worldmonitor.io", "BOLA finding confirmed"),
            ("TRIAGE_DECISION", "analyst@worldmonitor.io", "Missing Auth finding confirmed"),
            ("RETEST_PASSED", "developer@worldmonitor.io", "SQL Injection finding retested and remediated"),
            ("RATE_LIMIT_CHECK", "system", "Rate limiter active: 10 scans/hour"),
        ]
        for action, actor, details in audit_events:
            db.add(models.AuditLog(
                action=action,
                actor=actor,
                details=details,
                timestamp=datetime.utcnow() - timedelta(minutes=len(audit_events)),
            ))
        db.commit()

        print("[seed] OK: Seeded 3 users (hashed), 6 targets, 2 scans, 5 findings, 9 audit logs")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
