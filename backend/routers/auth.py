from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
from database import get_db
from schemas import LoginRequest, TokenOut, UserOut
from services.auth_service import (
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _add_audit(db: Session, action: str, actor: str, details: str = ""):
    db.add(models.AuditLog(action=action, actor=actor, details=details,
                            timestamp=datetime.utcnow()))
    db.commit()


@router.post("/login", response_model=TokenOut)
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.email == body.email.lower().strip()
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        _add_audit(db, "LOGIN_FAILED", body.email, "Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    _add_audit(db, "LOGIN_SUCCESS", user.email, f"Role: {user.role}")

    return TokenOut(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _add_audit(db, "LOGOUT", current_user.email, f"Session ended for role: {current_user.role}")
    return {"message": "Logged out successfully."}
