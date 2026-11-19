"""Smoke test for the FastAPI endpoint used by the Docker health check."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient


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
