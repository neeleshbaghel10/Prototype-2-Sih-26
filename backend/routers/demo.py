from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/demo-target", tags=["demo"])


@router.get("/v1/telemetry")
async def mock_vulnerable_telemetry(request: Request, user_id: int = 1):
    """
    Intentionally vulnerable demo endpoint.
    Demonstrates OWASP API1: BOLA — Missing object-level authorization.
    The user_id query parameter is trusted directly without ownership verification.
    """
    # Simulated user data store — in a real app this would be a DB query
    MOCK_USERS = {
        1: {
            "user_id": 1,
            "username": "alice_admin",
            "email": "alice@worldmonitor.io",
            "role": "admin",
            "api_key": "wm_live_ALICE_KEY_REDACTED",
            "last_login": "2026-09-28T22:10:00Z",
            "telemetry": {"scans_run": 42, "findings_triaged": 38},
        },
        2: {
            "user_id": 2,
            "username": "bob_analyst",
            "email": "bob@corp.internal",
            "role": "analyst",
            "api_key": "wm_live_BOB_KEY_REDACTED",
            "last_login": "2026-09-29T00:01:00Z",
            "telemetry": {"scans_run": 17, "findings_triaged": 12},
        },
        102: {
            "user_id": 102,
            "username": "victim_user",
            "email": "victim@corp.com",
            "role": "developer",
            "api_key": "sk-VICTIM_PROD_KEY_LEAKED",
            "ssn_partial": "XXX-XX-4521",
            "last_login": "2026-09-29T00:15:00Z",
            "telemetry": {"scans_run": 3, "findings_triaged": 1},
        },
    }

    user_data = MOCK_USERS.get(user_id)
    if not user_data:
        return JSONResponse(status_code=404, content={"error": "User not found"})

    # VULNERABILITY: Returns data for ANY user_id without checking who is calling
    # A real system must verify: caller owns this resource or has admin permission
    return JSONResponse(
        content={
            "warning": "DEMO — This endpoint intentionally lacks authorization checks (BOLA)",
            "requested_user_id": user_id,
            "data": user_data,
        }
    )
