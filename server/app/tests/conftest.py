"""Shared fixtures for isolated FastAPI tests.

The test app uses an in-memory SQLite database and never calls live AI or Places
services. The app and ORM models are imported lazily so a missing teammate
module is reported as a test failure instead of breaking pytest collection.
"""

from __future__ import annotations

import importlib
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool


@pytest.fixture(autouse=True)
def _reset_rate_limit() -> None:
    from app.core import rate_limit

    rate_limit.reset()


@pytest_asyncio.fixture
async def test_database() -> AsyncIterator[tuple[Any, async_sessionmaker[AsyncSession]]]:
    """Create a fresh SQLite database from all registered ORM models."""
    from app.db.models import Base

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    try:
        yield engine, session_factory
    finally:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
        await engine.dispose()


@pytest_asyncio.fixture
async def client(
    test_database: tuple[Any, async_sessionmaker[AsyncSession]],
) -> AsyncIterator[AsyncClient]:
    """Run requests in-process with an isolated SQLite database."""
    from app.db.session import get_db

    engine, session_factory = test_database
    application = importlib.import_module("main").app

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    application.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=application)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as test_client:
        try:
            yield test_client
        finally:
            application.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture
async def authenticated_client(client: AsyncClient) -> AsyncIterator[AsyncClient]:
    """Create one isolated account and attach its bearer token to API requests."""
    username = f"qa_{uuid4().hex[:12]}"
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": username, "password": "SaigonTrip!2026"},
    )
    assert response.status_code == 201, response.text
    client.headers["Authorization"] = f"Bearer {response.json()['token']}"
    yield client


@pytest.fixture
def trip_payload() -> dict[str, Any]:
    return {
        "title": "QA Saigon weekend",
        "start_location": "Quận 1, TP. Hồ Chí Minh",
        "budget": 3_000_000,
        "days": 2,
        "preferences": ["ẩm thực", "văn hóa"],
        "source": "form",
    }


async def create_trip(
    client: AsyncClient,
    payload: dict[str, Any],
    *,
    auth_token: str | None = None,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else None
    response = await client.post("/api/v1/trips/", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()
