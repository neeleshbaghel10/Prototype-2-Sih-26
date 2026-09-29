"""
Mock AI Triage Service
Returns structured remediation output including CVSS v3.1 scores, root cause analysis,
and side-by-side code diffs for each OWASP finding category.
"""

from typing import Optional

# ─── Mock Knowledge Base ─────────────────────────────────────────────────────

TRIAGE_KB = {
    "OWASP API1: BOLA": {
        "root_cause": (
            "Broken Object Level Authorization (BOLA) occurs when the API endpoint accepts a user-supplied "
            "object identifier (e.g., `user_id`, `order_id`) and uses it directly in database queries without "
            "verifying that the authenticated principal owns or has permission to access that object. "
            "The server trusts the client-supplied ID rather than deriving the resource owner from the "
            "session/JWT context."
        ),
        "cvss_score": 8.1,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N",
        "vulnerable_code": '''\
# VULNERABLE — FastAPI endpoint (no ownership check)
@router.get("/api/v1/telemetry")
async def get_telemetry(user_id: int, db: Session = Depends(get_db)):
    # ❌ Directly queries by caller-supplied ID — no ownership verification
    record = db.query(UserData).filter(UserData.user_id == user_id).first()
    return record
''',
        "patched_code": '''\
# PATCHED — Enforce ownership via JWT subject
@router.get("/api/v1/telemetry")
async def get_telemetry(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ✅ Derive user_id from authenticated token — never trust client input
    record = db.query(UserData).filter(
        UserData.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    return record
''',
        "suggested_patch": (
            "1. Remove the `user_id` query parameter entirely.\n"
            "2. Extract the authenticated user's identity from the JWT/session via a `get_current_user` dependency.\n"
            "3. Apply an ownership filter: `WHERE owner_id = current_user.id`.\n"
            "4. Add an integration test asserting user A cannot access user B's resources."
        ),
    },
    "OWASP API2: Broken Authentication": {
        "root_cause": (
            "The endpoint does not enforce JWT/session validation. Requests lacking a valid Bearer token are "
            "accepted and processed, allowing unauthenticated actors full data access. Additionally, tokens "
            "lack expiry enforcement and are not verified against a signing secret."
        ),
        "cvss_score": 9.1,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
        "vulnerable_code": '''\
# VULNERABLE — No auth dependency
@router.get("/api/v1/users")
async def list_users(db: Session = Depends(get_db)):
    # ❌ No authentication check — anyone can call this
    return db.query(User).all()
''',
        "patched_code": '''\
# PATCHED — Require valid JWT
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.get("/api/v1/users")
async def list_users(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ✅ JWT validated; role-checked inside get_current_user
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return db.query(User).all()
''',
        "suggested_patch": (
            "1. Add `OAuth2PasswordBearer` dependency to all protected routes.\n"
            "2. Validate JWT signature with `python-jose` and enforce `exp` claim.\n"
            "3. Rotate signing secrets via environment variables — never hardcode.\n"
            "4. Implement refresh token rotation with a 15-minute access token TTL."
        ),
    },
    "OWASP API3: Excessive Data Exposure": {
        "root_cause": (
            "The API serializes full ORM model instances including sensitive internal fields (password hashes, "
            "internal IDs, PII) and relies on the frontend to filter what is displayed. Attackers can intercept "
            "the raw HTTP response to harvest all exposed fields."
        ),
        "cvss_score": 6.5,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
        "vulnerable_code": '''\
# VULNERABLE — Returns full ORM model
@router.get("/api/v1/profile")
async def get_profile(user_id: int, db: Session = Depends(get_db)):
    # ❌ Exposes password_hash, internal flags, and all columns
    user = db.query(User).filter(User.id == user_id).first()
    return user.__dict__
''',
        "patched_code": '''\
# PATCHED — Return explicit Pydantic response model
class UserPublicOut(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

@router.get("/api/v1/profile", response_model=UserPublicOut)
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    # ✅ Only returns whitelisted fields via response_model
    return current_user
''',
        "suggested_patch": (
            "1. Define a strict Pydantic `response_model` for every endpoint.\n"
            "2. Never return `__dict__` or raw ORM objects.\n"
            "3. Audit all response schemas to exclude sensitive fields.\n"
            "4. Enable FastAPI's `response_model_exclude_unset=True` for partial responses."
        ),
    },
    "OWASP API7: Security Misconfiguration": {
        "root_cause": (
            "The API is deployed with default CORS policy (`allow_origins=['*']`), debug mode enabled, "
            "and stack traces exposed in error responses. HTTP security headers (HSTS, X-Frame-Options, "
            "CSP) are absent. The SQLite database file is world-readable."
        ),
        "cvss_score": 5.3,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
        "vulnerable_code": '''\
# VULNERABLE — Wildcard CORS + debug mode
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # ❌ Any origin allowed
    allow_methods=["*"],
    allow_headers=["*"],
)
# ❌ Debug traces exposed to client
@app.exception_handler(Exception)
async def debug_handler(req, exc):
    return JSONResponse({"error": str(exc), "trace": traceback.format_exc()})
''',
        "patched_code": '''\
# PATCHED — Strict CORS + safe error handler
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://app.worldmonitor.io").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,   # ✅ Explicit allowlist
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.exception_handler(Exception)
async def safe_handler(req, exc):
    logger.exception("Unhandled error")          # log internally
    return JSONResponse(                          # ✅ generic message to client
        status_code=500,
        content={"error": "Internal server error"},
    )
''',
        "suggested_patch": (
            "1. Replace `allow_origins=['*']` with an explicit environment-variable-driven allowlist.\n"
            "2. Disable debug/stacktrace responses in production (`DEBUG=False`).\n"
            "3. Add `SecurityHeadersMiddleware` setting HSTS, CSP, and X-Frame-Options.\n"
            "4. Restrict SQLite file permissions to the application user only."
        ),
    },
    "OWASP API8: Injection": {
        "root_cause": (
            "User-supplied search parameters are interpolated directly into raw SQL strings without "
            "parameterization, enabling SQL injection. A crafted `search` value such as `' OR '1'='1` "
            "returns all records, and `'; DROP TABLE users; --` can destroy data."
        ),
        "cvss_score": 9.8,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "vulnerable_code": '''\
# VULNERABLE — Raw SQL with string interpolation
@router.get("/api/v1/search")
async def search(q: str, db: Session = Depends(get_db)):
    # ❌ SQL Injection — attacker controls `q`
    sql = f"SELECT * FROM users WHERE username LIKE \'%{q}%\'"
    result = db.execute(text(sql))
    return result.fetchall()
''',
        "patched_code": '''\
# PATCHED — Parameterized ORM query
@router.get("/api/v1/search")
async def search(q: str, db: Session = Depends(get_db)):
    # ✅ SQLAlchemy ORM handles parameterization automatically
    results = db.query(User).filter(
        User.username.ilike(f"%{q}%")
    ).limit(50).all()
    return results
''',
        "suggested_patch": (
            "1. Never use f-strings or `.format()` to build SQL queries.\n"
            "2. Use SQLAlchemy ORM filters or `text()` with named bind parameters.\n"
            "3. Validate and sanitize all string inputs at the Pydantic schema layer.\n"
            "4. Run `sqlmap` in audit mode on all parameterized inputs before release."
        ),
    },
}


def get_triage(category: str, title: str, raw_trace: str) -> dict:
    """
    Returns structured triage output for a given finding category.
    Falls back to a generic template if category is unknown.
    """
    kb = TRIAGE_KB.get(category)
    if kb:
        return {
            "root_cause": kb["root_cause"],
            "cvss_score": kb["cvss_score"],
            "cvss_vector": kb["cvss_vector"],
            "vulnerable_code": kb.get("vulnerable_code", ""),
            "patched_code": kb.get("patched_code", ""),
            "suggested_patch": kb["suggested_patch"],
        }

    # Generic fallback
    return {
        "root_cause": (
            f"The finding '{title}' was identified during automated scanning. "
            "Manual review of the raw trace is required to determine the precise root cause. "
            "Ensure proper input validation, authentication, and least-privilege access controls are applied."
        ),
        "cvss_score": 5.0,
        "cvss_vector": "CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:L/A:N",
        "vulnerable_code": "# Vulnerable code — review raw trace for details",
        "patched_code": "# Apply security controls as recommended in suggested_patch",
        "suggested_patch": (
            "1. Review the raw trace to identify the precise vulnerability.\n"
            "2. Apply input validation and output encoding.\n"
            "3. Enforce authentication and authorization on the affected endpoint.\n"
            "4. Re-test after remediation."
        ),
    }
