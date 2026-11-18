"""
session.py — SQLAlchemy async session & connection pool configuration.
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
Modified: Đỗ Nguyễn An Khang — Added SQLite support for dev/demo
"""
from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# ---------------------------------------------------------------------------
# Database URL — from settings (.env)
# ---------------------------------------------------------------------------
DATABASE_URL: str = settings.DATABASE_URL

# ---------------------------------------------------------------------------
# Engine (async) — adapt parameters based on driver
# ---------------------------------------------------------------------------
_is_sqlite = DATABASE_URL.startswith("sqlite")

_engine_kwargs: dict = {}
if _is_sqlite:
    _engine_kwargs = {
        "echo": False,
        "connect_args": {"check_same_thread": False},
    }
else:
    _engine_kwargs = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "echo": False,
    }

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)


# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# FastAPI dependency: yields a DB session, ensures cleanup on error
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async SQLAlchemy session.

    Usage::

        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
