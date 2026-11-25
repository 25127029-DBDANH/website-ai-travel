"""UTC time helpers for SQLAlchemy TIMESTAMP WITHOUT TIME ZONE columns."""

from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return current UTC time as a naive datetime (tzinfo=None).

    ORM DateTime columns map to TIMESTAMP WITHOUT TIME ZONE, and asyncpg rejects
    timezone-aware datetimes when writing to those columns on PostgreSQL.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
