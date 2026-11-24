"""
session.py — SQLAlchemy async session & connection pool configuration.
Authors : Ngô Tấn Đạt (Places), Đỗ Nguyễn An Khang (Auth & Trips)

Supports both SQLite (local development with aiosqlite) and PostgreSQL
(production/Neon/Supabase with asyncpg).
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.db.migrations import ensure_schema
from app.db.models import Base

_SSL_REQUIRE_MODES = frozenset({"require", "verify-ca", "verify-full"})


def normalize_database_url(url: str) -> tuple[str, dict[str, object]]:
    """Normalize DB URL to an async driver scheme and return driver connect_args."""
    normalized = url.strip()
    if normalized.startswith("postgres://"):
        normalized = normalized.replace("postgres://", "postgresql+asyncpg://", 1)
    elif normalized.startswith("postgresql://") and not normalized.startswith(
        "postgresql+asyncpg://"
    ):
        normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif normalized.startswith("sqlite://") and not normalized.startswith("sqlite+aiosqlite://"):
        normalized = normalized.replace("sqlite://", "sqlite+aiosqlite://", 1)

    if normalized.startswith("sqlite"):
        return normalized, {"check_same_thread": False}

    if normalized.startswith("postgresql+asyncpg://"):
        parts = urlsplit(normalized)
        connect_args: dict[str, object] = {}
        kept_query: list[tuple[str, str]] = []
        for key, value in parse_qsl(parts.query, keep_blank_values=True):
            lower_key = key.lower()
            if lower_key == "sslmode":
                if value.lower() in _SSL_REQUIRE_MODES:
                    connect_args["ssl"] = "require"
            elif lower_key == "channel_binding":
                continue
            else:
                kept_query.append((key, value))
        clean_url = urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(kept_query), parts.fragment)
        )
        return clean_url, connect_args

    return normalized, {}


# ---------------------------------------------------------------------------
# Database URL & Dialect Detection (from settings / .env)
# ---------------------------------------------------------------------------
DATABASE_URL, CONNECT_ARGS = normalize_database_url(settings.DATABASE_URL)

# ---------------------------------------------------------------------------
# Engine Configuration
# ---------------------------------------------------------------------------
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_async_engine(
        DATABASE_URL,
        connect_args=CONNECT_ARGS,
        echo=False,
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        connect_args=CONNECT_ARGS,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_timeout=30,
        pool_recycle=1800,
        echo=False,
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
    Create all tables defined in ORM models and apply additive column migrations.
    Safe to call on startup; does not drop or alter existing columns.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_schema(conn)


# ---------------------------------------------------------------------------
# FastAPI dependency: yields a DB session, ensures cleanup on error
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides an async SQLAlchemy session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
