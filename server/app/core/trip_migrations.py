"""Cross-dialect migration for guest ownership of existing trips."""
from __future__ import annotations

from uuid import uuid4

from sqlalchemy import MetaData, inspect
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.schema import CreateIndex, CreateTable

from app.db.models import Trip


async def upgrade_trip_ownership_schema(engine: AsyncEngine) -> None:
    """Make an existing trips table support guest ownership without losing rows."""
    async with engine.begin() as connection:
        if connection.dialect.name == "sqlite":
            await _upgrade_sqlite(connection)
        elif connection.dialect.name == "postgresql":
            await _upgrade_postgresql(connection)
        else:
            raise RuntimeError(
                f"Guest trip ownership migration does not support {connection.dialect.name}."
            )


async def _upgrade_sqlite(connection) -> None:
    def inspect_schema(sync_connection):
        inspector = inspect(sync_connection)
        if "trips" not in inspector.get_table_names():
            return None
        columns = {column["name"]: column for column in inspector.get_columns("trips")}
        checks = inspector.get_check_constraints("trips")
        has_owner_check = any(
            check.get("name") == "ck_trips_owner_required" for check in checks
        )
        needs_rebuild = (
            "session_id" not in columns
            or columns["user_id"]["nullable"] is False
            or not has_owner_check
        )
        return columns, needs_rebuild

    schema = await connection.run_sync(inspect_schema)
    if schema is None:
        return
    existing_columns, needs_rebuild = schema
    if not needs_rebuild:
        await _ensure_sqlite_indexes(connection)
        return

    temp_name = f"trips_migrating_{uuid4().hex}"
    metadata = MetaData()
    temp_table = Trip.__table__.to_metadata(metadata, name=temp_name)
    temp_table.indexes.clear()
    for column in Trip.__table__.columns:
        if column.name not in existing_columns and column.name != "session_id":
            raise RuntimeError(
                f"Cannot migrate trips: existing database is missing {column.name!r}."
            )

    ddl = str(CreateTable(temp_table).compile(dialect=connection.dialect))
    await connection.exec_driver_sql(ddl)

    quote = connection.dialect.identifier_preparer.quote
    target_columns = [column.name for column in Trip.__table__.columns]
    target_sql = ", ".join(quote(name) for name in target_columns)
    source_sql = ", ".join(
        quote(name) if name in existing_columns else "NULL"
        for name in target_columns
    )
    await connection.exec_driver_sql(
        f"INSERT INTO {quote(temp_name)} ({target_sql}) "
        f"SELECT {source_sql} FROM {quote('trips')}"
    )
    await connection.exec_driver_sql("DROP TABLE trips")
    await connection.exec_driver_sql(
        f"ALTER TABLE {quote(temp_name)} RENAME TO {quote('trips')}"
    )
    await _ensure_sqlite_indexes(connection)


async def _ensure_sqlite_indexes(connection) -> None:
    for index in Trip.__table__.indexes:
        statement = CreateIndex(index, if_not_exists=True).compile(
            dialect=connection.dialect
        )
        await connection.exec_driver_sql(str(statement))


async def _upgrade_postgresql(connection) -> None:
    columns = {
        column["name"]: column
        for column in await connection.run_sync(
            lambda sync_connection: inspect(sync_connection).get_columns("trips")
        )
    }
    if "session_id" not in columns:
        await connection.exec_driver_sql(
            "ALTER TABLE trips ADD COLUMN session_id VARCHAR(36) NULL"
        )
    if columns["user_id"]["nullable"] is False:
        await connection.exec_driver_sql(
            "ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL"
        )

    checks = await connection.run_sync(
        lambda sync_connection: inspect(sync_connection).get_check_constraints("trips")
    )
    if not any(check.get("name") == "ck_trips_owner_required" for check in checks):
        await connection.exec_driver_sql(
            "ALTER TABLE trips ADD CONSTRAINT ck_trips_owner_required "
            "CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)"
        )

    for index in Trip.__table__.indexes:
        statement = CreateIndex(index, if_not_exists=True).compile(
            dialect=connection.dialect
        )
        await connection.exec_driver_sql(str(statement))
