"""
auth.py — Authentication endpoints (register, login, google, me, delete account).
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""

from __future__ import annotations

import logging
import re
import secrets
from datetime import datetime, timezone

import anyio
from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.password_policy import RESERVED_USERNAMES, validate_password, validate_username
from app.core.rate_limit import (
    check_login_rate_limit,
    clear_login_failures,
    record_login_failure,
)
from app.core.security import (
    DUMMY_HASH,
    create_access_token,
    hash_password,
    is_usable_password,
    make_unusable_password,
    verify_password,
)
from app.db.models import Trip, User
from app.db.session import get_db
from app.schemas.user import (
    AuthResponse,
    DeleteAccountRequest,
    GoogleAuthRequest,
    UserCreate,
    UserLogin,
    UserOut,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

_GOOGLE_VALID_ISSUERS = frozenset({"accounts.google.com", "https://accounts.google.com"})
_GOOGLE_RATE_LIMIT_KEY = "__google__"


def _mask_sub(sub: str) -> str:
    if len(sub) <= 6:
        return "***"
    return f"{sub[:4]}...{sub[-2:]}"


def _verify_google_token_sync(token: str, client_id: str) -> dict:
    """Synchronous wrapper around google-auth ID token verification."""
    return google_id_token.verify_oauth2_token(
        token,
        google_requests.Request(),
        client_id,
    )


async def _verify_google_id_token(token: str, *, invalid_status: int) -> dict:
    client_id = settings.GOOGLE_CLIENT_ID.strip()
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AUTH_GOOGLE_NOT_CONFIGURED",
        )

    cleaned_token = token.strip()
    if not cleaned_token:
        raise HTTPException(status_code=invalid_status, detail="AUTH_GOOGLE_INVALID")

    try:
        claims = await anyio.to_thread.run_sync(_verify_google_token_sync, cleaned_token, client_id)
    except (ValueError, GoogleAuthError):
        raise HTTPException(status_code=invalid_status, detail="AUTH_GOOGLE_INVALID")

    if (
        not isinstance(claims, dict)
        or claims.get("iss") not in _GOOGLE_VALID_ISSUERS
        or claims.get("email_verified") is not True
        or not isinstance(claims.get("sub"), str)
        or not claims["sub"].strip()
        or len(claims["sub"].strip()) > 64
    ):
        raise HTTPException(status_code=invalid_status, detail="AUTH_GOOGLE_INVALID")

    return claims


def _sanitize_email_username(email: str) -> str:
    local = email.split("@", 1)[0].lower()
    cleaned = re.sub(r"[^a-z0-9_]", "_", local)
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    return cleaned[:26].strip("_")


async def _generate_unique_username(db: AsyncSession, email: str) -> str:
    base = _sanitize_email_username(email)
    candidates: list[str] = []
    if len(base) >= 3 and base not in RESERVED_USERNAMES:
        candidates.append(base)

    # Keep prefix <= 25 chars so prefix + "_" + 4 random digits stays <= 30 chars.
    prefix = base[:25].strip("_") or "user"
    for _ in range(5):
        suffix = f"{secrets.randbelow(10000):04d}"
        candidates.append(f"{prefix}_{suffix}")

    for candidate in candidates:
        try:
            validated = validate_username(candidate)
        except HTTPException:
            continue
        exists = await db.execute(
            select(User.id).where(func.lower(User.username) == validated.lower())
        )
        if exists.scalar_one_or_none() is None:
            return validated

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="AUTH_USERNAME_GENERATION_FAILED",
    )


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

    if user is None or not is_usable_password(user.hashed_password):
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
# POST /google
# ---------------------------------------------------------------------------
@router.post("/google", response_model=AuthResponse)
async def google_login(
    payload: GoogleAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not settings.GOOGLE_CLIENT_ID.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AUTH_GOOGLE_NOT_CONFIGURED",
        )

    client_ip = request.client.host if request.client else "unknown"
    check_login_rate_limit(_GOOGLE_RATE_LIMIT_KEY, client_ip)

    try:
        claims = await _verify_google_id_token(
            payload.id_token,
            invalid_status=status.HTTP_401_UNAUTHORIZED,
        )
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            record_login_failure(_GOOGLE_RATE_LIMIT_KEY, client_ip)
            logger.warning("Google login rejected: invalid ID token")
        raise

    raw_email = claims.get("email")
    email = raw_email.strip().lower() if isinstance(raw_email, str) else ""
    if not email or "@" not in email or len(email) > 254:
        record_login_failure(_GOOGLE_RATE_LIMIT_KEY, client_ip)
        logger.warning("Google login rejected: missing valid email claim")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_GOOGLE_INVALID",
        )

    clear_login_failures(_GOOGLE_RATE_LIMIT_KEY, client_ip)

    google_sub = claims["sub"].strip()
    raw_name = claims.get("name")
    full_name = raw_name.strip()[:120] if isinstance(raw_name, str) and raw_name.strip() else None
    raw_picture = claims.get("picture")
    avatar_url = (
        raw_picture.strip() if isinstance(raw_picture, str) and raw_picture.strip() else None
    )

    result = await db.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalars().first()
    created = False

    if user is None:
        username = await _generate_unique_username(db, email)
        user = User(
            username=username,
            email=email,
            google_sub=google_sub,
            hashed_password=make_unusable_password("google"),
            full_name=full_name,
            avatar_url=avatar_url,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        created = True
    else:
        updated = False
        if not user.full_name and full_name:
            user.full_name = full_name
            updated = True
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
            updated = True
        if not user.email and email:
            user.email = email
            updated = True
        if updated:
            user.updated_at = datetime.now(timezone.utc)
            await db.flush()
            await db.refresh(user)

    logger.info("Google login succeeded for sub=%s (created=%s)", _mask_sub(google_sub), created)
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
    if is_usable_password(user.hashed_password):
        if not payload.password or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AUTH_PASSWORD_INVALID",
            )
    else:
        if not user.google_sub or not payload.id_token or not payload.id_token.strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AUTH_GOOGLE_INVALID",
            )
        claims = await _verify_google_id_token(
            payload.id_token,
            invalid_status=status.HTTP_403_FORBIDDEN,
        )
        token_sub = claims["sub"].strip()
        if not secrets.compare_digest(token_sub, user.google_sub):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AUTH_GOOGLE_INVALID",
            )

    # The shared ORM model has no declared cascade relationship, so remove owned
    # trips explicitly before deleting the account.
    await db.execute(delete(Trip).where(Trip.user_id == user.id))
    await db.delete(user)
    return {"success": True}
