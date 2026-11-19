"""Places search, local fallback, and API-key privacy tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.integration
async def test_places_search_returns_the_documented_collection_shape(client: AsyncClient) -> None:
    response = await client.get("/api/v1/places/search", params={"limit": 10, "offset": 0})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload.get("total"), int)
    assert isinstance(payload.get("results"), list)


@pytest.mark.integration
async def test_places_search_forwards_filters_and_pagination(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.api.v1.endpoints import places

    seen: dict[str, object] = {}

    async def fake_search_places(db: object, **filters: object) -> list[dict[str, object]]:
        seen.update(filters)
        return []

    monkeypatch.setattr(places, "search_places", fake_search_places)
    response = await client.get(
        "/api/v1/places/search",
        params={"q": "museum", "district": "Quận 1", "category": "culture", "limit": 7},
    )

    assert response.status_code == 200, response.text
    assert seen == {
        "q": "museum",
        "district": "Quận 1",
        "category": "culture",
        "is_indoor": None,
        "limit": 7,
        "offset": 0,
    }


@pytest.mark.integration
async def test_photo_proxy_returns_service_unavailable_without_a_key(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.api.v1.endpoints import places

    monkeypatch.setattr(places, "_GOOGLE_PLACES_API_KEY", "")
    response = await client.get("/api/v1/places/photo", params={"name": "places/example/photos/1"})

    assert response.status_code == 503
    assert "AIza" not in response.text


@pytest.mark.integration
async def test_places_search_does_not_expose_api_key_in_results(client: AsyncClient) -> None:
    response = await client.get("/api/v1/places/search", params={"limit": 10})

    assert response.status_code == 200, response.text
    assert "AIza" not in response.text


@pytest.mark.asyncio
async def test_place_enrichment_falls_back_without_google_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services import places_service

    monkeypatch.setattr(places_service, "GOOGLE_PLACES_API_KEY", "")

    result = await places_service._fetch_google_place_details("place-id")

    assert result is None


def test_places_cache_entry_expires_after_seven_days() -> None:
    from datetime import datetime, timedelta

    from app.db.models import PlaceCache
    from app.services.places_service import CACHE_TTL_DAYS

    cached = PlaceCache.create_entry("google-place-id", {"name": "War Remnants Museum"})

    assert CACHE_TTL_DAYS == 7
    assert cached.expires_at - cached.cached_at == timedelta(days=7)
    assert not cached.is_expired()

    cached.expires_at = datetime.utcnow() - timedelta(seconds=1)
    assert cached.is_expired()
