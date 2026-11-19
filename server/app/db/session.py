"""
session.py — SQLAlchemy async session & connection pool configuration.
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)

Supports both SQLite (local development with aiosqlite) and PostgreSQL
(production/Supabase with asyncpg).
"""
from __future__ import annotations

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.models import Base

# ---------------------------------------------------------------------------
# Database URL & Dialect Detection
# ---------------------------------------------------------------------------
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./travel.db",
)

# Auto-convert synchronous or standard URLs to async driver schemes
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("sqlite://") and not DATABASE_URL.startswith("sqlite+aiosqlite://"):
    DATABASE_URL = DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://", 1)

# ---------------------------------------------------------------------------
# Engine Configuration
# ---------------------------------------------------------------------------
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
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
# Table initialization helper
# ---------------------------------------------------------------------------
async def create_tables() -> None:
    """
    Create all tables defined in ORM models.
    Safe to call on startup; does not drop or alter existing tables.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


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
