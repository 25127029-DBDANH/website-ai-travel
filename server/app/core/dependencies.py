"""
dependencies.py — FastAPI dependency injection for auth & DB session.
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timezone
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import false, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.models import User
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


@dataclass(frozen=True)
class TripOwner:
    """Authenticated account or unclaimed guest session that owns a trip."""

    user: User | None = None
    session_id: str | None = None


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Return the authenticated User row or raise 401."""
    return await _authenticate(token, db, for_update=False)


async def get_current_user_for_update(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await _authenticate(token, db, for_update=True)


async def lock_user(db: AsyncSession, *criteria) -> User | None:
    """Serialize credential changes before reading any mutable proof or token."""
    if db.get_bind().dialect.name == "sqlite":
        # SQLite ignores FOR UPDATE. Start a write transaction without changing a row.
        await db.execute(update(User).where(false()).values(updated_at=User.updated_at))
    return await db.scalar(
        select(User).where(*criteria).with_for_update().execution_options(populate_existing=True)
    )


async def _authenticate(token: str | None, db: AsyncSession, *, for_update: bool) -> User:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_REQUIRED",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_TOKEN_EXPIRED",
        )

    user = await lock_user(db, User.id == user_id) if for_update else await db.get(User, user_id)
    if user is not None:
        changed = user.password_changed_at
        if changed is None or "iat" not in payload:
            return user
        changed_second = int(changed.replace(tzinfo=timezone.utc).timestamp())
        # The credential stamp distinguishes sessions issued in the same UTC second.
        if int(payload["iat"]) >= changed_second and (
            "pwd_at" not in payload or payload["pwd_at"] == changed.isoformat()
        ):
            return user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="AUTH_TOKEN_EXPIRED",
    )


async def get_optional_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Return the authenticated user or None (no error)."""
    if token is None:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except HTTPException:
        return None


async def get_owner(
    token: str | None = Depends(oauth2_scheme),
    session_id: UUID | None = Header(default=None, alias="x-session-id"),
    db: AsyncSession = Depends(get_db),
) -> TripOwner:
    """Use a valid bearer token when present, otherwise require a guest UUID."""
    if token is not None:
        return TripOwner(user=await get_current_user(token=token, db=db))
    if session_id is not None:
        return TripOwner(session_id=str(session_id))
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="AUTH_REQUIRED",
        headers={"WWW-Authenticate": "Bearer"},
    )
