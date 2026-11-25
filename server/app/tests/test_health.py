"""Smoke and readiness tests for FastAPI health endpoints."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


@pytest.mark.asyncio
async def test_openapi_endpoint_is_available_for_container_healthcheck() -> None:
    # Import the app lazily: the backend application is supplied by its owning branch.
    from main import app

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200, response.text
    assert response.json().get("openapi")
    assert response.json().get("info", {}).get("title")


@pytest.mark.asyncio
async def test_health_includes_commit_when_set_or_null(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    response_unset = await client.get("/health")
    assert response_unset.status_code == 200, response_unset.text
    body_unset = response_unset.json()
    assert body_unset["status"] == "healthy"
    assert body_unset["commit"] is None

    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc123def456")
    response_set = await client.get("/health")
    assert response_set.status_code == 200, response_set.text
    body_set = response_set.json()
    assert body_set["status"] == "healthy"
    assert body_set["commit"] == "abc123def456"


@pytest.mark.asyncio
async def test_health_ready_returns_200_when_db_and_places_ready(
    client: AsyncClient,
    test_database: tuple[Any, async_sessionmaker[AsyncSession]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.db.models import Place

    _, session_factory = test_database
    async with session_factory() as session:
        session.add(
            Place(
                name="Ben Thanh Market",
                name_vi="Chợ Bến Thành",
                address="Lê Lợi, Phường Bến Thành, Quận 1",
                district="Quận 1",
                latitude=10.7725,
                longitude=106.6980,
                category="market",
                is_indoor=True,
                entry_fee_vnd=0,
            )
        )
        await session.commit()

    monkeypatch.setenv("RENDER_GIT_COMMIT", "deadbeef0123456789")
    response = await client.get("/health/ready")

    assert response.status_code == 200, response.text
    assert response.json() == {
        "status": "ready",
        "db": "ok",
        "places": 1,
        "commit": "deadbeef0123456789",
    }


@pytest.mark.asyncio
async def test_health_ready_returns_503_when_places_empty(
    client: AsyncClient,
) -> None:
    response = await client.get("/health/ready")

    assert response.status_code == 503, response.text
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["error"] == "empty_places_catalog"


@pytest.mark.asyncio
async def test_health_ready_returns_503_when_session_raises_without_leaking_dsn(
    client: AsyncClient,
) -> None:
    from app.db.session import get_db
    from main import app

    class _FailingSession:
        async def execute(self, *_args: Any, **_kwargs: Any) -> Any:
            raise RuntimeError("postgresql://admin:supersecret@db.internal:5432/prod")

        async def rollback(self) -> None:
            return None

    async def override_failing_db() -> AsyncIterator[Any]:
        yield _FailingSession()

    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_failing_db
    try:
        response = await client.get("/health/ready")
    finally:
        if previous_override is not None:
            app.dependency_overrides[get_db] = previous_override
        else:
            app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503, response.text
    assert response.json() == {
        "status": "not_ready",
        "error": "RuntimeError",
    }
    assert "supersecret" not in response.text
    assert "postgresql://" not in response.text
