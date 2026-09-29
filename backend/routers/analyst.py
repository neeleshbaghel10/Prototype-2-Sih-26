import asyncio
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
from database import get_db, SessionLocal
from schemas import ScanLaunchRequest, ScanJobOut, FindingOut, TriageRequest
from services.scanner import check_whitelist, check_rate_limit, run_mock_scan, stream_scan_logs
from services.auth_service import require_analyst_or_admin, get_current_user

router = APIRouter(tags=["analyst"])


async def _run_scan_with_own_session(scan_id: int, target_url: str):
    db = SessionLocal()
    try:
        await run_mock_scan(scan_id, target_url, db)
    finally:
        db.close()


# ─── Scan Launch ─────────────────────────────────────────────────────────────

@router.post("/api/scans/launch", response_model=ScanJobOut)
async def launch_scan(
    body: ScanLaunchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_analyst_or_admin),
):
    if not check_whitelist(body.target_url, db):
        raise HTTPException(
            status_code=403,
            detail="Target URL is not on the authorized whitelist. Contact your admin.",
        )
    if not check_rate_limit():
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Max 10 scans per hour.")

    job = models.ScanJob(
        target_url=body.target_url,
        scan_type=body.scan_type,
        status="queued",
        progress_percentage=0.0,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    db.add(models.AuditLog(action="SCAN_LAUNCHED", actor=current_user.email,
                            details=f"Scan #{job.id} on {body.target_url}",
                            timestamp=datetime.utcnow()))
    db.commit()

    background_tasks.add_task(_run_scan_with_own_session, job.id, body.target_url)
    return job


# ─── Scan Status ─────────────────────────────────────────────────────────────

@router.get("/api/scans/{scan_id}/status", response_model=ScanJobOut)
async def scan_status(
    scan_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_analyst_or_admin),
):
    scan = db.query(models.ScanJob).filter_by(id=scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


# ─── SSE Stream ──────────────────────────────────────────────────────────────

@router.get("/api/scans/{scan_id}/stream")
async def scan_stream(
    scan_id: int,
    token: str = None,  # Query-param fallback for EventSource (browsers can't set Authorization headers)
    db: Session = Depends(get_db),
):
    """
    SSE endpoint for real-time scan log streaming.
    Accepts JWT via Bearer header OR ?token= query param (EventSource limitation).
    """
    from services.auth_service import decode_access_token

    # Validate token from query param if provided (EventSource path)
    if token:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token.")
        user = db.query(models.User).filter_by(id=int(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found.")
    else:
        # Require Authorization header when no query token
        from fastapi import Request
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide ?token= for EventSource clients.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scan = db.query(models.ScanJob).filter_by(id=scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return StreamingResponse(
        stream_scan_logs(scan_id, scan.target_url),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ─── Findings ────────────────────────────────────────────────────────────────

@router.get("/api/scans/{scan_id}/findings", response_model=list[FindingOut])
async def get_findings(
    scan_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_analyst_or_admin),
):
    scan = db.query(models.ScanJob).filter_by(id=scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return db.query(models.Finding).filter_by(scan_id=scan_id).all()


@router.get("/api/findings", response_model=list[FindingOut])
async def get_all_findings(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return db.query(models.Finding).all()


# ─── Triage ──────────────────────────────────────────────────────────────────

@router.post("/api/findings/{finding_id}/triage")
async def triage_finding(
    finding_id: int,
    body: TriageRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_analyst_or_admin),
):
    finding = db.query(models.Finding).filter_by(id=finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    if body.decision == "confirm":
        finding.status = "confirmed"
    elif body.decision == "false_positive":
        finding.status = "false_positive"
    else:
        raise HTTPException(status_code=400, detail="Decision must be 'confirm' or 'false_positive'")

    db.add(models.AuditLog(action="TRIAGE_DECISION", actor=current_user.email,
                            details=f"Finding #{finding_id} marked {finding.status}",
                            timestamp=datetime.utcnow()))
    db.commit()
    db.refresh(finding)
    return {"id": finding_id, "status": finding.status}


# ─── Report Export ────────────────────────────────────────────────────────────

@router.get("/api/reports/{scan_id}/export")
async def export_report(
    scan_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_analyst_or_admin),
):
    scan = db.query(models.ScanJob).filter_by(id=scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    findings = db.query(models.Finding).filter_by(scan_id=scan_id).all()
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in findings:
        if f.severity in severity_counts:
            severity_counts[f.severity] += 1

    cvss_scores = [f.cvss_score for f in findings]
    avg_cvss = round(sum(cvss_scores) / len(cvss_scores), 2) if cvss_scores else 0.0
    max_cvss = max(cvss_scores) if cvss_scores else 0.0
    owasp_map = {}
    for f in findings:
        owasp_map.setdefault(f.category, []).append(f.title)

    return {
        "report_generated_at": datetime.utcnow().isoformat(),
        "scan": {
            "id": scan.id, "target_url": scan.target_url, "status": scan.status,
            "scan_type": scan.scan_type,
            "created_at": scan.created_at.isoformat(),
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        },
        "executive_summary": {
            "total_findings": len(findings),
            "severity_breakdown": severity_counts,
            "average_cvss_score": avg_cvss,
            "max_cvss_score": max_cvss,
            "risk_level": "CRITICAL" if max_cvss >= 9.0 else "HIGH" if max_cvss >= 7.0 else "MEDIUM",
        },
        "owasp_mapping": owasp_map,
        "findings": [
            {"id": f.id, "title": f.title, "category": f.category, "severity": f.severity,
             "cvss_score": f.cvss_score, "cvss_vector": f.cvss_vector, "endpoint": f.endpoint,
             "status": f.status, "root_cause": f.root_cause, "suggested_patch": f.suggested_patch}
            for f in findings
        ],
    }
