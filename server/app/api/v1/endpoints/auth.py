"""
auth.py — Authentication endpoints (register, login, me, delete account).
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.password_policy import validate_password, validate_username
from app.core.rate_limit import (
    check_login_rate_limit,
    clear_login_failures,
    record_login_failure,
)
from app.core.security import DUMMY_HASH, create_access_token, hash_password, verify_password
from app.db.models import User
from app.db.session import get_db
from app.schemas.user import (
    AuthResponse,
    DeleteAccountRequest,
    UserCreate,
    UserLogin,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# POST /register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    name = validate_username(payload.username)
    validate_password(payload.password, name)

    # Check if username already taken (case-insensitive)
    result = await db.execute(select(User).where(func.lower(User.username) == name.lower()))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AUTH_USERNAME_TAKEN",
        )

    user = User(
        username=name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return AuthResponse(
        user=UserOut.model_validate(user),
        token=token,
        claimed_trips=0,
    )


# ---------------------------------------------------------------------------
# POST /login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    check_login_rate_limit(payload.username, client_ip)

    result = await db.execute(
        select(User).where(func.lower(User.username) == payload.username.strip().lower())
    )
    user = result.scalars().first()

    if user is None:
        verify_password(payload.password, DUMMY_HASH)
        record_login_failure(payload.username, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_INVALID_CREDENTIALS",
        )

    if not verify_password(payload.password, user.hashed_password):
        record_login_failure(payload.username, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_INVALID_CREDENTIALS",
        )

    clear_login_failures(payload.username, client_ip)
    token = create_access_token({"sub": user.id})
    return AuthResponse(
        user=UserOut.model_validate(user),
        token=token,
        claimed_trips=0,
    )


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------
@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"user": UserOut.model_validate(user)}


# ---------------------------------------------------------------------------
# DELETE /me
# ---------------------------------------------------------------------------
@router.delete("/me")
async def delete_account(
    payload: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AUTH_PASSWORD_INVALID",
        )

    # The shared ORM model has no declared cascade relationship, so remove owned
    # trips explicitly before deleting the account.
    from app.db.models import Trip

    await db.execute(delete(Trip).where(Trip.user_id == user.id))
    await db.delete(user)
    return {"success": True}
