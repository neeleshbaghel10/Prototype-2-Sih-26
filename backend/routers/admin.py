from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from schemas import ScopeTargetCreate, ScopeTargetOut, AuditLogOut
from services.auth_service import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _log_action(db: Session, action: str, actor: str, details: str = ""):
    log = models.AuditLog(action=action, actor=actor, details=details, timestamp=datetime.utcnow())
    db.add(log)
    db.commit()


@router.get("/targets", response_model=list[ScopeTargetOut])
async def list_targets(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.ScopeTarget).all()


@router.post("/targets", response_model=ScopeTargetOut)
async def add_target(
    body: ScopeTargetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    existing = db.query(models.ScopeTarget).filter_by(target_url=body.target_url).first()
    if existing:
        raise HTTPException(status_code=409, detail="Target already exists")
    target = models.ScopeTarget(
        target_url=body.target_url,
        is_whitelisted=body.is_whitelisted,
        created_by=current_user.email,
    )
    db.add(target)
    db.commit()
    db.refresh(target)
    _log_action(db, "ADD_TARGET", current_user.email, f"Added target: {body.target_url}")
    return target


@router.delete("/targets/{target_id}")
async def delete_target(
    target_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    target = db.query(models.ScopeTarget).filter_by(id=target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    url = target.target_url
    db.delete(target)
    db.commit()
    _log_action(db, "DELETE_TARGET", current_user.email, f"Removed target: {url}")
    return {"message": f"Deleted target {target_id}"}


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def get_audit_logs(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(100).all()
    return logs


@router.get("/health")
async def system_health(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    scan_count = db.query(models.ScanJob).count()
    finding_count = db.query(models.Finding).count()
    target_count = db.query(models.ScopeTarget).filter_by(is_whitelisted=True).count()
    return {
        "status": "healthy",
        "scan_jobs_total": scan_count,
        "findings_total": finding_count,
        "whitelisted_targets": target_count,
        "rate_limit_active": True,
        "rate_limit_max_per_hour": 10,
        "mock_mode": True,
        "engine_version": "2.4.1",
        "uptime_seconds": 3600,
    }
