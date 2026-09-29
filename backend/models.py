from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False, default="")
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="analyst")  # admin | analyst | developer
    created_at = Column(DateTime, default=datetime.utcnow)


class ScopeTarget(Base):
    __tablename__ = "scope_targets"

    id = Column(Integer, primary_key=True, index=True)
    target_url = Column(String, nullable=False, unique=True)
    is_whitelisted = Column(Boolean, default=True)
    created_by = Column(String, nullable=False, default="admin")


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(Integer, primary_key=True, index=True)
    target_url = Column(String, nullable=False)
    scan_type = Column(String, nullable=False, default="full")
    status = Column(String, nullable=False, default="queued")  # queued|running|completed|failed
    progress_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_jobs.id"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # CRITICAL|HIGH|MEDIUM|LOW
    cvss_score = Column(Float, nullable=False)
    cvss_vector = Column(String, nullable=False)
    endpoint = Column(String, nullable=False)
    raw_trace = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    suggested_patch = Column(Text, nullable=False)
    vulnerable_code = Column(Text, nullable=True)
    patched_code = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending_review")  # pending_review|confirmed|false_positive|remediated

    scan = relationship("ScanJob", back_populates="findings")
    retest_logs = relationship("RetestLog", back_populates="finding", cascade="all, delete-orphan")


class RetestLog(Base):
    __tablename__ = "retest_logs"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(Integer, ForeignKey("findings.id"), nullable=False)
    status = Column(String, nullable=False)  # passed|failed
    execution_timestamp = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    finding = relationship("Finding", back_populates="retest_logs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
