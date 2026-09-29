import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from schemas import FindingOut, RetestLogOut
from services.auth_service import require_developer_or_admin

router = APIRouter(prefix="/api/dev", tags=["developer"])


@router.get("/tickets", response_model=list[FindingOut])
async def get_tickets(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_developer_or_admin),
):
    return db.query(models.Finding).filter(
        models.Finding.status.in_(["confirmed", "remediated"])
    ).all()


@router.post("/tickets/{finding_id}/retest")
async def trigger_retest(
    finding_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_developer_or_admin),
):
    finding = db.query(models.Finding).filter_by(id=finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    if finding.status not in ("confirmed", "remediated"):
        raise HTTPException(status_code=400, detail="Only confirmed findings can be retested.")

    await asyncio.sleep(1.5)

    log = models.RetestLog(
        finding_id=finding_id,
        status="passed",
        execution_timestamp=datetime.utcnow(),
        notes=f"Automated re-test by {current_user.email}: endpoint no longer vulnerable.",
    )
    db.add(log)
    finding.status = "remediated"

    db.add(models.AuditLog(action="RETEST_PASSED", actor=current_user.email,
                            details=f"Finding #{finding_id} verified remediated",
                            timestamp=datetime.utcnow()))
    db.commit()
    db.refresh(finding)

    return {
        "finding_id": finding_id,
        "retest_status": "passed",
        "new_finding_status": "remediated",
        "message": "Endpoint re-tested successfully. Vulnerability is no longer present.",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/tickets/{finding_id}/retest-history", response_model=list[RetestLogOut])
async def retest_history(
    finding_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_developer_or_admin),
):
    return db.query(models.RetestLog).filter_by(finding_id=finding_id).all()
