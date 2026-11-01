"""
session.py — SQLAlchemy async session & connection pool configuration.
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
"""
from __future__ import annotations

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# ---------------------------------------------------------------------------
# Database URL
# ---------------------------------------------------------------------------
# Reads DATABASE_URL from environment.  Fall back to a local dev default so
# the app can start without a real .env during first-run exploration.
# Example:  postgresql+asyncpg://user:password@localhost:5432/travel_db
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/travel_db",
)


# ---------------------------------------------------------------------------
# Engine (async)
# ---------------------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,           # number of persistent connections in the pool
    max_overflow=20,        # extra connections beyond pool_size under load
    pool_timeout=30,        # seconds to wait for a free connection
    pool_recycle=1800,      # recycle connections every 30 min (avoids stale TCP)
    echo=False,             # set True for SQL query logging during dev
)


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
# Declarative Base (shared by all ORM models)
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """Base class that all SQLAlchemy ORM models inherit from."""
    pass


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
