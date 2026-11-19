"""AI response structure and itinerary grounding contract tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.tests.conftest import create_trip


@pytest.mark.integration
async def test_trip_chat_returns_a_structured_ai_response_without_live_credentials(
    client: AsyncClient, trip_payload: dict[str, object], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "")
    trip = await create_trip(client, trip_payload)

    response = await client.post(f"/api/trips/{trip['id']}/chat", json={"message": "Plan my trip"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload.get("status") in {"asking", "generating", "completed", "failed"}
    assert isinstance(payload.get("reply"), str)
    assert isinstance(payload.get("quick_replies", []), list)
    itinerary = payload.get("updated_itinerary") or []
    for item in itinerary:
        assert isinstance(item.get("place_name"), str) and item["place_name"].strip()
        assert -90 <= float(item["latitude"]) <= 90
        assert -180 <= float(item["longitude"]) <= 180


@pytest.mark.integration
async def test_ai_swap_returns_alternatives_with_valid_coordinates(
    client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    trip = await create_trip(client, trip_payload)
    response = await client.post(
        "/api/v1/ai/swap",
        json={
            "trip_id": trip["id"],
            "place_name": "Independence Palace",
            "reason": "Prefer an indoor cultural place",
        },
    )

    assert response.status_code == 200, response.text
    alternatives = response.json().get("alternatives")
    assert isinstance(alternatives, list)
    assert 2 <= len(alternatives) <= 3
    for place in alternatives:
        assert place.get("name")
        assert -90 <= float(place["latitude"]) <= 90
        assert -180 <= float(place["longitude"]) <= 180
