"""
dependencies.py — FastAPI dependency injection for auth & DB session.
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
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

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_TOKEN_EXPIRED",
        )
    return user


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
