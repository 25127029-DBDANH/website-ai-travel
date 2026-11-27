"""Lightweight idempotent additive schema migrations for SQLite and PostgreSQL.

`Base.metadata.create_all()` only creates missing tables and does not add new columns
to tables that already exist with data. `ensure_schema()` inspects existing tables and
runs `ALTER TABLE ... ADD COLUMN` for any missing nullable column declared in
`COLUMN_MIGRATIONS`, followed by `CREATE [UNIQUE] INDEX IF NOT EXISTS` for indexes in
`INDEX_MIGRATIONS`.

How to add a new column later:
  Append a single `(table_name, column_name, ddl_type)` tuple to `COLUMN_MIGRATIONS`.
"""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncConnection

logger = logging.getLogger(__name__)

# Declarative list of additive columns: (table, column, sql_ddl_type)
COLUMN_MIGRATIONS: tuple[tuple[str, str, str], ...] = (
    ("users", "email", "VARCHAR(254)"),
    ("users", "google_sub", "VARCHAR(64)"),
    ("users", "email_verified", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("users", "password_changed_at", "TIMESTAMP"),
    ("users", "recovery_code_hash", "TEXT"),
    ("places", "photo_is_generic", "BOOLEAN NOT NULL DEFAULT TRUE"),
)

# Declarative list of indexes: (index_name, table, column, is_unique)
INDEX_MIGRATIONS: tuple[tuple[str, str, str, bool], ...] = (
    ("ix_users_email", "users", "email", False),
    ("ix_users_google_sub", "users", "google_sub", True),
)


def _inspect_existing_columns(sync_conn: Connection) -> dict[str, set[str]]:
    inspector = inspect(sync_conn)
    tables_needed = {table for table, _, _ in COLUMN_MIGRATIONS} | {
        table for _, table, _, _ in INDEX_MIGRATIONS
    }
    existing: dict[str, set[str]] = {}
    for table in tables_needed:
        if inspector.has_table(table):
            existing[table] = {col["name"] for col in inspector.get_columns(table)}
    return existing


async def ensure_schema(conn: AsyncConnection) -> None:
    """Add any missing declared columns and indexes safely on SQLite and PostgreSQL."""
    existing_columns = await conn.run_sync(_inspect_existing_columns)

    for table, column, ddl_type in COLUMN_MIGRATIONS:
        table_cols = existing_columns.get(table)
        if table_cols is None or column in table_cols:
            continue
        await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
        table_cols.add(column)
        logger.info("Applied schema migration: added %s.%s (%s)", table, column, ddl_type)

    for index_name, table, column, is_unique in INDEX_MIGRATIONS:
        table_cols = existing_columns.get(table)
        if table_cols is None or column not in table_cols:
            continue
        unique_kw = "UNIQUE " if is_unique else ""
        await conn.execute(
            text(f"CREATE {unique_kw}INDEX IF NOT EXISTS {index_name} ON {table} ({column})")
        )
