from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    display_name: str
    role: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Scope Targets ───────────────────────────────────────────────────────────

class ScopeTargetCreate(BaseModel):
    target_url: str
    is_whitelisted: bool = True

class ScopeTargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_url: str
    is_whitelisted: bool
    created_by: str


# ─── Scan Jobs ───────────────────────────────────────────────────────────────

class ScanLaunchRequest(BaseModel):
    target_url: str
    scan_type: str = "full"
    auth_token: Optional[str] = None

class ScanJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_url: str
    scan_type: str
    status: str
    progress_percentage: float
    created_at: datetime
    completed_at: Optional[datetime] = None


# ─── Findings ────────────────────────────────────────────────────────────────

class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    scan_id: int
    title: str
    category: str
    severity: str
    cvss_score: float
    cvss_vector: str
    endpoint: str
    raw_trace: str
    root_cause: str
    suggested_patch: str
    vulnerable_code: Optional[str] = None
    patched_code: Optional[str] = None
    status: str

class TriageRequest(BaseModel):
    decision: str  # confirm | false_positive


# ─── Retest ──────────────────────────────────────────────────────────────────

class RetestLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    finding_id: int
    status: str
    execution_timestamp: datetime
    notes: Optional[str] = None


# ─── Audit ───────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    action: str
    actor: str
    details: Optional[str] = None
    timestamp: datetime


# ─── Report ──────────────────────────────────────────────────────────────────

class ReportOut(BaseModel):
    scan: ScanJobOut
    findings: list[FindingOut]
    summary: dict
