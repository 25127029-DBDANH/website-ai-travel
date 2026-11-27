"""
auth.py — Authentication endpoints (register, login, google, me, delete account).
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import re
import secrets
from datetime import timedelta
from email.errors import HeaderParseError
from email.headerregistry import Address
from uuid import UUID, uuid4

import anyio
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user, get_current_user_for_update, lock_user
from app.core.password_policy import RESERVED_USERNAMES, validate_password, validate_username
from app.core.rate_limit import (
    MAX_FAILED_ATTEMPTS,
    check_login_rate_limit,
    clear_login_failures,
    record_login_failure,
    release_attempt,
    reserve_attempt,
)
from app.core.security import (
    DUMMY_HASH,
    create_access_token,
    generate_recovery_code,
    hash_password,
    is_usable_password,
    make_unusable_password,
    normalize_recovery_code,
    verify_password,
)
from app.db.models import PasswordResetToken, Trip, User
from app.db.session import get_db
from app.schemas.user import (
    AuthResponse,
    ChangePasswordRequest,
    CurrentPasswordRequest,
    DeleteAccountRequest,
    EmailRequest,
    GoogleAuthRequest,
    RecoveryResetRequest,
    TokenResetRequest,
    UserCreate,
    UserLogin,
    UserOut,
    VerifyEmailRequest,
)
from app.services import email_service
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

_GOOGLE_VALID_ISSUERS = frozenset({"accounts.google.com", "https://accounts.google.com"})
_GOOGLE_RATE_LIMIT_KEY = "__google__"


def _user_token(user: User) -> str:
    changed = user.password_changed_at
    return create_access_token({"sub": user.id, "pwd_at": changed.isoformat() if changed else None})


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


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


async def _claim_guest_trips(user: User, session_id: UUID | None, db: AsyncSession) -> int:
    """Claim only trips that are still owned by this guest session."""
    if session_id is None:
        return 0
    result = await db.execute(
        update(Trip)
        .where(Trip.session_id == str(session_id), Trip.user_id.is_(None))
        .values(user_id=user.id, updated_at=utc_now())
        .returning(Trip.id)
    )
    return len(result.scalars().all())


# ---------------------------------------------------------------------------
# POST /register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    session_id: UUID | None = Header(default=None, alias="x-session-id"),
    db: AsyncSession = Depends(get_db),
):
    name = validate_username(payload.username)
    validate_password(payload.password, name)

    # Check if username already taken (case-insensitive)
    result = await db.execute(select(User).where(func.lower(User.username) == name.lower()))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AUTH_USERNAME_TAKEN",
        )

    recovery_code, recovery_hash = await anyio.to_thread.run_sync(generate_recovery_code)
    user = User(
        username=name,
        hashed_password=await anyio.to_thread.run_sync(hash_password, payload.password),
        recovery_code_hash=recovery_hash,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    claimed_trips = await _claim_guest_trips(user, session_id, db)
    token = _user_token(user)
    return AuthResponse(
        user=UserOut.model_validate(user),
        token=token,
        claimed_trips=claimed_trips,
        recovery_code=recovery_code,
    )


# ---------------------------------------------------------------------------
# POST /login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=AuthResponse)
async def login(
    payload: UserLogin,
    request: Request,
    session_id: UUID | None = Header(default=None, alias="x-session-id"),
    db: AsyncSession = Depends(get_db),
):
    client_ip = _client_ip(request)
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
    claimed_trips = await _claim_guest_trips(user, session_id, db)
    token = _user_token(user)
    return AuthResponse(
        user=UserOut.model_validate(user),
        token=token,
        claimed_trips=claimed_trips,
    )


async def _check_current_password(user: User, password: str) -> None:
    if not is_usable_password(user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AUTH_PASSWORD_NOT_SET",
        )
    if not await anyio.to_thread.run_sync(verify_password, password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AUTH_PASSWORD_INVALID",
        )


async def _invalidate_reset_links(db: AsyncSession, user: User) -> None:
    await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.purpose == "reset",
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=utc_now())
    )


async def _set_password(db: AsyncSession, user: User, password: str) -> None:
    validate_password(password, user.username)
    user.hashed_password = await anyio.to_thread.run_sync(hash_password, password)
    user.password_changed_at = user.updated_at = utc_now()
    await _invalidate_reset_links(db, user)
    await db.flush()


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user_for_update),
    db: AsyncSession = Depends(get_db),
):
    await _check_current_password(user, payload.current_password)
    await _set_password(db, user, payload.new_password)
    return {"success": True, "token": _user_token(user)}


@router.get("/config")
async def auth_config():
    return {"email_recovery_enabled": settings.email_recovery_enabled}


@router.post("/recovery-code")
async def regenerate_recovery_code(
    payload: CurrentPasswordRequest,
    user: User = Depends(get_current_user_for_update),
):
    await _check_current_password(user, payload.current_password)
    code, user.recovery_code_hash = await anyio.to_thread.run_sync(generate_recovery_code)
    return {"recovery_code": code}


@router.post("/reset-password/recovery-code")
async def reset_with_recovery_code(
    payload: RecoveryResetRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    name = payload.username.strip().lower()
    ip = _client_ip(request)
    stamp = reserve_attempt("recovery", name, ip, MAX_FAILED_ATTEMPTS)
    if stamp is None:
        raise HTTPException(429, "AUTH_RATE_LIMITED")

    user = None
    if re.fullmatch(r"[a-z0-9_]{1,60}", name):
        user = await lock_user(db, func.lower(User.username) == name)
    stored = user.recovery_code_hash if user and user.has_password else None
    code = normalize_recovery_code(payload.recovery_code)
    valid = await anyio.to_thread.run_sync(verify_password, code, stored or DUMMY_HASH)
    if not valid or not stored:
        raise HTTPException(400, "AUTH_RECOVERY_INVALID")

    release_attempt("recovery", name, ip, stamp)
    await _set_password(db, user, payload.new_password)
    new_code, user.recovery_code_hash = await anyio.to_thread.run_sync(generate_recovery_code)
    return {"success": True, "recovery_code": new_code}


def _email_address(value: str) -> str | None:
    email = value.strip().lower()
    if not email or len(email) > 254 or any(ord(c) < 32 or ord(c) == 127 for c in email):
        return None
    try:
        address = Address(addr_spec=email)
    except (ValueError, HeaderParseError, AttributeError, IndexError):
        # The standard-library parser can also raise on incomplete domain literals.
        return None
    if not address.username or not address.domain or address.addr_spec != email:
        return None
    return email


async def _email_available(db: AsyncSession, email: str, user_id: str | None) -> bool:
    # The legacy email index is non-unique. Serialize claims to an as-yet unused
    # address without requiring existing databases to discard duplicate addresses.
    if db.get_bind().dialect.name == "postgresql":
        await db.execute(select(func.pg_advisory_xact_lock(func.hashtext(email))))
    owner = await db.scalar(
        select(User.id).where(func.lower(User.email) == email, User.id != user_id).limit(1)
    )
    return owner is None


def _token_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _verification_hash(user_id: str, token_id: str, code: str) -> str:
    # A per-issuance salt also lets the same six digits occur again under a unique hash.
    return _token_hash(f"{user_id}:{token_id}:{code}")


@router.post("/email")
async def add_email(
    payload: EmailRequest,
    background: BackgroundTasks,
    user: User = Depends(get_current_user_for_update),
    db: AsyncSession = Depends(get_db),
):
    if not settings.email_recovery_enabled:
        raise HTTPException(503, "EMAIL_DISABLED")
    email = _email_address(payload.email)
    if email is None:
        raise HTTPException(400, "AUTH_EMAIL_INVALID")
    if not await _email_available(db, email, user.id):
        raise HTTPException(409, "AUTH_EMAIL_TAKEN")

    user.email, user.email_verified = email, False
    await _invalidate_reset_links(db, user)
    await db.execute(
        delete(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id, PasswordResetToken.purpose == "email_verify"
        )
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    token_id = uuid4().hex
    db.add(
        PasswordResetToken(
            id=token_id,
            user_id=user.id,
            purpose="email_verify",
            token_hash=_verification_hash(user.id, token_id, code),
            expires_at=utc_now() + timedelta(minutes=15),
        )
    )
    await db.commit()
    background.add_task(email_service.send_verification_code, email, code)
    return {"success": True}


@router.post("/email/verify")
async def verify_email(
    payload: VerifyEmailRequest,
    user: User = Depends(get_current_user_for_update),
    db: AsyncSession = Depends(get_db),
):
    proof = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id, PasswordResetToken.purpose == "email_verify"
        )
    )
    now = utc_now()
    if proof is None or proof.expires_at <= now:
        raise HTTPException(400, "AUTH_EMAIL_CODE_INVALID")
    if proof.attempts >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(429, "AUTH_RATE_LIMITED")
    if proof.used_at is not None:
        raise HTTPException(400, "AUTH_EMAIL_CODE_INVALID")
    candidate = _verification_hash(user.id, proof.id, payload.code)
    if not hmac.compare_digest(proof.token_hash, candidate):
        proof.attempts += 1
        if proof.attempts >= MAX_FAILED_ATTEMPTS:
            proof.used_at = now
        # get_db rolls back HTTP exceptions. Persist the failed guess before returning 400.
        await db.commit()
        raise HTTPException(400, "AUTH_EMAIL_CODE_INVALID")

    proof.used_at = now
    user.email_verified = True
    return {"email_verified": True}


@router.post("/forgot-password")
async def forgot_password(
    payload: EmailRequest,
    request: Request,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    success = {"success": True}
    email = _email_address(payload.email)
    if not settings.email_recovery_enabled or email is None:
        return success
    if reserve_attempt("forgot", email, _client_ip(request), 3) is None:
        return success
    user = await lock_user(db, func.lower(User.email) == email, User.email_verified.is_(True))
    if user is None or not user.has_password:
        return success

    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            purpose="reset",
            token_hash=_token_hash(token),
            expires_at=utc_now() + timedelta(minutes=30),
        )
    )
    await db.commit()
    background.add_task(email_service.send_reset_link, email, token)
    return success


@router.post("/reset-password")
async def reset_with_token(payload: TokenResetRequest, db: AsyncSession = Depends(get_db)):
    digest = _token_hash(payload.token)
    query = select(PasswordResetToken).where(
        PasswordResetToken.token_hash == digest, PasswordResetToken.purpose == "reset"
    )
    # Always lock the user first, including when two different links are redeemed.
    owner = query.with_only_columns(PasswordResetToken.user_id).scalar_subquery()
    user = await lock_user(db, User.id == owner)
    proof = await db.scalar(query)
    if (
        user is None
        or not user.has_password
        or proof is None
        or proof.used_at is not None
        or proof.expires_at <= utc_now()
        or not hmac.compare_digest(digest, proof.token_hash)
    ):
        raise HTTPException(400, "AUTH_RESET_TOKEN_INVALID")
    await _set_password(db, user, payload.new_password)
    return {"success": True}


# ---------------------------------------------------------------------------
# POST /google
# ---------------------------------------------------------------------------
@router.post("/google", response_model=AuthResponse)
async def google_login(
    payload: GoogleAuthRequest,
    request: Request,
    session_id: UUID | None = Header(default=None, alias="x-session-id"),
    db: AsyncSession = Depends(get_db),
):
    if not settings.GOOGLE_CLIENT_ID.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AUTH_GOOGLE_NOT_CONFIGURED",
        )

    client_ip = _client_ip(request)
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

    user = await lock_user(db, User.google_sub == google_sub)
    created = False

    if user is None:
        username = await _generate_unique_username(db, email)
        available = await _email_available(db, email, None)
        user = User(
            username=username,
            email=email if available else None,
            email_verified=available,
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
        if not user.email and await _email_available(db, email, user.id):
            user.email = email
            user.email_verified = True
            updated = True
        elif user.email == email and not user.email_verified:
            user.email_verified = True
            updated = True
        if updated:
            user.updated_at = utc_now()
            await db.flush()
            await db.refresh(user)

    logger.info("Google login succeeded for sub=%s (created=%s)", _mask_sub(google_sub), created)
    claimed_trips = await _claim_guest_trips(user, session_id, db)
    token = _user_token(user)
    return AuthResponse(
        user=UserOut.model_validate(user),
        token=token,
        claimed_trips=claimed_trips,
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
    user: User = Depends(get_current_user_for_update),
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
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    await db.delete(user)
    return {"success": True}
