"""Structured AI schema tests that do not call Gemini."""

from __future__ import annotations

import importlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
import pytest_asyncio
from httpx import AsyncClient
from pydantic import ValidationError

from app.schemas.ai import PlaceResponse

_VN_TZ = timezone(timedelta(hours=7))


def _swap_option(place_id: str, place_name: str) -> dict[str, object]:
    return {
        "place_id": place_id,
        "place_name": place_name,
        "category": "culture",
        "description": "An indoor cultural stop in central Ho Chi Minh City.",
        "address": "District 1, Ho Chi Minh City",
        "district": "Quận 1",
        "latitude": 10.78,
        "longitude": 106.69,
        "estimated_cost": 50000,
        "photo_url": "",
        "editorial_score": 4.5,
        "is_indoor": True,
        "opening_hours": [],
        "suggested_duration": 60,
        "replacement_reason": "Similar indoor cultural experience nearby.",
    }


def test_trip_concept_schema_rejects_days_outside_the_supported_range() -> None:
    from app.schemas.ai import TripConceptRequest

    payload = {
        "start_location": "Quận 1, TP. Hồ Chí Minh",
        "budget": 3_000_000,
        "days": 15,
        "districts": ["Quận 1"],
        "places_per_day": 4,
        "companion": "friends",
        "member_count": 3,
        "transport_mode": "grab_bike",
        "preferences": ["food", "culture"],
        "pace": "moderate",
        "special_notes": "",
    }

    with pytest.raises(ValidationError):
        TripConceptRequest.model_validate(payload)


def test_smart_swap_schema_accepts_two_alternatives_and_rejects_one() -> None:
    from app.schemas.ai import SmartSwapResponse

    valid = SmartSwapResponse(
        alternatives=[
            _swap_option("place-1", "Independence Palace"),
            _swap_option("place-2", "War Remnants Museum"),
        ]
    )
    assert len(valid.alternatives) == 2

    with pytest.raises(ValidationError):
        SmartSwapResponse(alternatives=[_swap_option("place-1", "Independence Palace")])


def _sample_place(
    place_id: str,
    district: str,
    category: str = "food",
    *,
    is_indoor: bool = True,
    opening_hours: list[str] | None = None,
    place_name: str | None = None,
) -> dict[str, object]:
    return {
        "place_id": place_id,
        "place_name": place_name or f"Place {place_id}",
        "category": category,
        "description": f"Verified local stop in {district}.",
        "address": f"123 Street, {district}",
        "district": district,
        "latitude": 10.77,
        "longitude": 106.69,
        "estimated_cost": 60_000,
        "photo_url": "",
        "editorial_score": 4.6,
        "is_indoor": is_indoor,
        "opening_hours": ["08:00 - 21:00"] if opening_hours is None else opening_hours,
        "suggested_duration": 60,
    }


def _concept_payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "start_location": "Quận 1, TP. Hồ Chí Minh",
        "budget": 3_000_000,
        "days": 1,
        "districts": ["Quận 1"],
        "places_per_day": 3,
        "companion": "family",
        "member_count": 4,
        "transport_mode": "grab_car",
        "preferences": ["food", "cafe"],
        "pace": "relaxed",
        "special_notes": "",
    }
    base.update(overrides)
    return base


def test_trip_concept_schema_defaults_optional_dietary_and_avoid_districts() -> None:
    from app.schemas.ai import TripConceptRequest

    legacy = TripConceptRequest.model_validate(_concept_payload())
    assert legacy.dietary == []
    assert legacy.avoid_districts == []
    assert (legacy.interests, legacy.vibe_energy, legacy.vibe_spend) == ([], None, None)

    enriched = TripConceptRequest.model_validate(
        _concept_payload(dietary=["vegetarian", "no_seafood"], avoid_districts=["Quận 7"])
    )
    assert enriched.dietary == ["vegetarian", "no_seafood"]
    assert enriched.avoid_districts == ["Quận 7"]


def test_gemini_prompt_includes_dietary_and_avoid_districts() -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest
    from app.services.gemini_service import GeminiService

    request = TripConceptRequest.model_validate(
        _concept_payload(dietary=["vegetarian"], avoid_districts=["Quận 5", "Quận 7"])
    )
    places = [PlaceResponse.model_validate(_sample_place("p1", "Quận 1"))]
    prompt = GeminiService._prompt("Suggest a concept", request, places, "Follow rules.")

    assert "DIETARY REQUIREMENTS" in prompt
    assert "vegetarian" in prompt
    assert "DISTRICTS TO AVOID" in prompt
    assert "Quận 5" in prompt
    assert "Quận 7" in prompt


@pytest.mark.asyncio
async def test_gemini_service_filters_out_avoid_districts_in_concept_and_itinerary() -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_sample_place("q1-1", "Quận 1", "food")),
        PlaceResponse.model_validate(_sample_place("q1-2", "Quận 1", "cafe")),
        PlaceResponse.model_validate(_sample_place("q1-3", "Quận 1", "sightseeing")),
        PlaceResponse.model_validate(_sample_place("q3-1", "Quận 3", "food")),
        PlaceResponse.model_validate(_sample_place("q3-2", "Quận 3", "cafe")),
        PlaceResponse.model_validate(_sample_place("q3-3", "Quận 3", "sightseeing")),
    ]
    service = GeminiService(api_key=None)
    concept_req = TripConceptRequest.model_validate(
        _concept_payload(districts=["Quận 1"], avoid_districts=["Quận 1"])
    )

    concept = await service.suggest_concept(concept_req, places)
    assert concept.recommended_districts == ["Quận 3"]
    assert all("q1-" not in h for h in concept.highlights)

    gen_req = TripGenerationRequest.model_validate(
        {
            **_concept_payload(districts=["Quận 1"], avoid_districts=["Quận 1"]),
            "approved_concept": concept.model_dump(),
        }
    )
    generated = await service.generate_itinerary(gen_req, places)
    assert len(generated.itinerary_items) == 3
    assert all(item.district == "Quận 3" for item in generated.itinerary_items)


@pytest.mark.asyncio
async def test_gemini_service_keeps_places_when_avoid_districts_would_empty_catalog() -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest
    from app.services.gemini_service import GeminiService

    places = [PlaceResponse.model_validate(_sample_place("q1-1", "Quận 1", "food"))]
    service = GeminiService(api_key=None)
    concept_req = TripConceptRequest.model_validate(
        _concept_payload(districts=["Quận 1"], avoid_districts=["Quận 1"])
    )

    concept = await service.suggest_concept(concept_req, places)
    assert concept.recommended_districts == ["Quận 1"]


@pytest_asyncio.fixture
async def ai_client(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> AsyncClient:
    from app.api.v1.endpoints import ai as ai_endpoint
    from app.schemas.ai import PlaceResponse
    from app.services.gemini_service import GeminiService

    application = importlib.import_module("main").app
    previous_service = getattr(application.state, "gemini_service", None)
    application.state.gemini_service = GeminiService(api_key=None)

    sample_catalog = [
        PlaceResponse.model_validate(_sample_place("q1-1", "Quận 1", "food")),
        PlaceResponse.model_validate(_sample_place("q1-2", "Quận 1", "cafe")),
        PlaceResponse.model_validate(_sample_place("q1-3", "Quận 1", "sightseeing")),
    ]

    async def _fake_load_catalog(*args: Any, **kwargs: Any) -> list[PlaceResponse]:
        return sample_catalog

    monkeypatch.setattr(ai_endpoint, "_load_catalog", _fake_load_catalog)
    try:
        yield client
    finally:
        application.state.gemini_service = previous_service


@pytest.mark.asyncio
async def test_ai_concept_endpoint_accepts_legacy_payload_returns_200(
    ai_client: AsyncClient,
) -> None:
    response = await ai_client.post("/api/v1/ai/concept", json=_concept_payload())
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["source"] == "fallback"
    assert body["recommended_districts"] == ["Quận 1"]


@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", ["concept", "generate"])
@pytest.mark.parametrize(
    ("fields", "status"),
    [
        ({"interests": ["coffee_retro", "history"], "vibe_energy": 0, "vibe_spend": 100}, 200),
        ({"interests": ["unknown"]}, 422),
        (
            {"interests": ["history", "markets", "parks", "riverside", "chinatown", "family_fun"]},
            422,
        ),
        ({"vibe_energy": -1}, 422),
        ({"vibe_spend": 101}, 422),
    ],
)
async def test_ai_validates_detailed_interests_and_vibe(ai_client, endpoint, fields, status):
    payload = _generation_payload() if endpoint == "generate" else _concept_payload()
    response = await ai_client.post(f"/api/v1/ai/{endpoint}", json={**payload, **fields})
    assert response.status_code == status, response.text


def test_detailed_interests_still_require_legacy_preferences():
    from app.schemas.ai import TripConceptRequest

    payload = _concept_payload(interests=["history"])
    del payload["preferences"]
    with pytest.raises(ValidationError) as exc:
        TripConceptRequest.model_validate(payload)
    assert exc.value.errors()[0]["loc"] == ("preferences",)


@pytest.mark.parametrize(
    ("energy", "spend", "energy_text", "spend_text"),
    [
        (0, 33, "nhịp thong thả", "ưu tiên bình dân"),
        (33, 34, "nhịp thong thả", "tầm trung"),
        (34, 67, "cân bằng", "chịu chi, nơi đẹp/sang"),
        (66, 66, "cân bằng", "tầm trung"),
        (67, 100, "khám phá nhiều", "chịu chi, nơi đẹp/sang"),
    ],
)
def test_prompt_interest_line_and_vibe_boundaries(energy, spend, energy_text, spend_text):
    from app.schemas.ai import TripConceptRequest
    from app.services.gemini_service import GeminiService

    places = [PlaceResponse.model_validate(_sample_place("cafe", "Quận 1", "cafe"))]
    legacy = TripConceptRequest.model_validate(_concept_payload())
    req = TripConceptRequest.model_validate(
        _concept_payload(
            interests=["coffee_retro", "history", "rooftop_night", "markets", "local_life"],
            vibe_energy=energy,
            vibe_spend=spend,
        )
    )
    before = GeminiService._prompt("Concept", legacy, places, "")
    after = GeminiService._prompt("Concept", req, places, "")
    line = next(line for line in after.splitlines() if "Sở thích" in line)
    assert all(
        label in line
        for label in (
            "Cà phê chill, retro",
            "Lịch sử & chiến tranh",
            "Rooftop & ngắm thành phố",
            "Chợ & mua sắm địa phương",
            "Đời sống địa phương",
            energy_text,
            spend_text,
        )
    )
    assert 0 < len(after) - len(before) <= 600


@pytest.mark.asyncio
async def test_ai_concept_endpoint_rejects_invalid_day_start_returns_422(
    ai_client: AsyncClient,
) -> None:
    response = await ai_client.post(
        "/api/v1/ai/concept",
        json=_concept_payload(day_start="25:00"),
    )
    assert response.status_code == 422, response.text


@pytest.mark.asyncio
async def test_ai_concept_endpoint_rejects_short_time_window_returns_422(
    ai_client: AsyncClient,
) -> None:
    response = await ai_client.post(
        "/api/v1/ai/concept",
        json=_concept_payload(day_start="09:00", day_end="12:00"),
    )
    assert response.status_code == 422, response.text


@pytest.mark.asyncio
async def test_ai_concept_endpoint_rejects_more_than_five_must_visit_ids_returns_422(
    ai_client: AsyncClient,
) -> None:
    response = await ai_client.post(
        "/api/v1/ai/concept",
        json=_concept_payload(must_visit_ids=["p1", "p2", "p3", "p4", "p5", "p6"]),
    )
    assert response.status_code == 422, response.text


@pytest.mark.asyncio
async def test_ai_concept_endpoint_rejects_travel_date_too_far_ahead_returns_422(
    ai_client: AsyncClient,
) -> None:
    too_far = (datetime.now(_VN_TZ).date() + timedelta(days=400)).isoformat()
    response = await ai_client.post(
        "/api/v1/ai/concept",
        json=_concept_payload(travel_date=too_far),
    )
    assert response.status_code == 422, response.text

    too_past = (datetime.now(_VN_TZ).date() - timedelta(days=2)).isoformat()
    past_response = await ai_client.post(
        "/api/v1/ai/concept",
        json=_concept_payload(travel_date=too_past),
    )
    assert past_response.status_code == 422, past_response.text


def test_apply_constraints_filters_closed_places_and_keeps_unparseable_hours() -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(
            _sample_place("morning", "Quận 1", opening_hours=["07:00 - 15:00"])
        ),
        PlaceResponse.model_validate(
            _sample_place("night-only", "Quận 1", opening_hours=["18:00 - 23:00"])
        ),
        PlaceResponse.model_validate(
            _sample_place("unknown-hours", "Quận 1", opening_hours=["Mở cửa cả ngày"])
        ),
        PlaceResponse.model_validate(_sample_place("empty-hours", "Quận 1", opening_hours=[])),
        PlaceResponse.model_validate(
            _sample_place("avoid-q7", "Quận 7", opening_hours=["08:00 - 17:00"])
        ),
    ]
    req = TripConceptRequest.model_validate(
        _concept_payload(day_start="08:00", day_end="14:00", avoid_districts=["Quận 7"])
    )

    filtered = GeminiService._apply_constraints(places, req)
    assert [p.place_id for p in filtered] == ["morning", "unknown-hours", "empty-hours"]

    # min_count=4 relaxes opening hours first while still excluding avoid_districts (Quận 7).
    relaxed_time = GeminiService._apply_constraints(places, req, min_count=4)
    assert [p.place_id for p in relaxed_time] == [
        "morning",
        "night-only",
        "unknown-hours",
        "empty-hours",
    ]


def test_apply_constraints_keeps_must_visit_even_in_avoid_district_and_logs_unknown(
    caplog: pytest.LogCaptureFixture,
) -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(
            _sample_place("q1-open", "Quận 1", opening_hours=["08:00 - 17:00"])
        ),
        PlaceResponse.model_validate(
            _sample_place("q7-must", "Quận 7", opening_hours=["19:00 - 23:00"])
        ),
        PlaceResponse.model_validate(
            _sample_place("q7-drop", "Quận 7", opening_hours=["08:00 - 17:00"])
        ),
    ]
    req = TripConceptRequest.model_validate(
        _concept_payload(
            day_start="08:00",
            day_end="14:00",
            avoid_districts=["Quận 7"],
            must_visit_ids=["q7-must", "non-existent-id"],
        )
    )

    with caplog.at_level(logging.DEBUG, logger="app.services.gemini_service"):
        filtered = GeminiService._apply_constraints(places, req)

    assert [p.place_id for p in filtered] == ["q1-open", "q7-must"]
    assert any("non-existent-id" in record.message for record in caplog.records)


def test_apply_constraints_prefer_indoor_sorts_indoor_first_without_dropping_outdoor() -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_sample_place("out-1", "Quận 1", is_indoor=False)),
        PlaceResponse.model_validate(_sample_place("in-1", "Quận 1", is_indoor=True)),
        PlaceResponse.model_validate(_sample_place("out-2", "Quận 1", is_indoor=False)),
        PlaceResponse.model_validate(_sample_place("in-2", "Quận 1", is_indoor=True)),
    ]
    req = TripConceptRequest.model_validate(_concept_payload(prefer_indoor=True))

    ordered = GeminiService._apply_constraints(places, req)
    assert [p.place_id for p in ordered] == ["in-1", "in-2", "out-1", "out-2"]


def test_fallback_itinerary_and_concept_prioritize_must_visit_places() -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_sample_place("q1-1", "Quận 1", "food")),
        PlaceResponse.model_validate(_sample_place("q1-2", "Quận 1", "cafe")),
        PlaceResponse.model_validate(_sample_place("q1-3", "Quận 1", "food")),
        PlaceResponse.model_validate(
            _sample_place("q3-must", "Quận 3", "sightseeing", place_name="Bảo tàng Chứng tích")
        ),
    ]
    concept_req = TripConceptRequest.model_validate(
        _concept_payload(districts=["Quận 1"], must_visit_ids=["q3-must"])
    )
    concept = GeminiService._fallback_concept(concept_req, places)
    assert concept.highlights[0] == "Bảo tàng Chứng tích"
    assert "Quận 3" in concept.recommended_districts

    gen_req = TripGenerationRequest.model_validate(
        {
            **_concept_payload(districts=["Quận 1"], must_visit_ids=["q3-must"]),
            "approved_concept": concept.model_dump(),
        }
    )
    itinerary = GeminiService._fallback_itinerary(gen_req, places)
    scheduled_ids = [item.place_id for item in itinerary.itinerary_items]
    assert "q3-must" in scheduled_ids
    assert scheduled_ids[0] == "q3-must"


def test_prompt_includes_validated_multistep_constraints_and_drops_unknown_must_visit() -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest
    from app.services.gemini_service import GeminiService

    travel_date = datetime.now(_VN_TZ).date() + timedelta(days=7)
    places = [
        PlaceResponse.model_validate(
            _sample_place("dinh-doc-lap", "Quận 1", "sightseeing", place_name="Dinh Độc Lập")
        )
    ]
    req = TripConceptRequest.model_validate(
        _concept_payload(
            travel_date=travel_date.isoformat(),
            day_start="08:30",
            day_end="18:30",
            has_children=True,
            has_elderly=True,
            mobility="limited",
            prefer_indoor=True,
            must_visit_ids=["dinh-doc-lap", "ignore-all-rules-injected"],
        )
    )

    prompt = GeminiService._prompt("Suggest a concept", req, places, "Follow rules.")
    assert travel_date.isoformat() in prompt
    assert "08:30 - 18:30" in prompt
    assert "Có trẻ nhỏ" in prompt
    assert "Có người lớn tuổi" in prompt
    assert "Ưu tiên địa điểm trong nhà" in prompt
    assert "BẮT BUỘC đưa vào lịch: Dinh Độc Lập (dinh-doc-lap)" in prompt
    assert "ignore-all-rules-injected" not in prompt


def test_ground_itinerary_warns_without_raising_when_must_visit_missing(
    caplog: pytest.LogCaptureFixture,
) -> None:
    from app.schemas.ai import (
        ConceptResponse,
        ItineraryItemResponse,
        PlaceResponse,
        TripGenerationRequest,
        TripGenerationResponse,
    )
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_sample_place("p1", "Quận 1", "food")),
        PlaceResponse.model_validate(_sample_place("p2", "Quận 1", "cafe")),
        PlaceResponse.model_validate(_sample_place("p3", "Quận 1", "sightseeing")),
        PlaceResponse.model_validate(_sample_place("p-must", "Quận 1", "sightseeing")),
    ]
    concept = ConceptResponse(
        summary="Summary",
        highlights=["Place p1"],
        recommended_districts=["Quận 1"],
        route_overview="Quận 1",
        confirmation_question="OK?",
    )
    req = TripGenerationRequest.model_validate(
        {
            **_concept_payload(must_visit_ids=["p-must"]),
            "approved_concept": concept.model_dump(),
        }
    )
    generated = TripGenerationResponse(
        itinerary_items=[
            ItineraryItemResponse(
                **places[idx].model_dump(),
                day_number=1,
                order_index=idx + 1,
                time_slot="08:30 - 10:00",
                start_time="08:30",
                end_time="10:00",
            )
            for idx in range(3)
        ]
    )

    with caplog.at_level(logging.WARNING, logger="app.services.gemini_service"):
        grounded = GeminiService._ground_itinerary(generated, req, places)

    assert len(grounded.itinerary_items) == 3
    assert any("p-must" in record.message for record in caplog.records)


# ---------------------------------------------------------------------------
# Tests for issue #37: transit_info auto-fill & GeminiService fallback coverage
# ---------------------------------------------------------------------------


def _make_place(
    place_id: str,
    district: str,
    category: str = "food",
    *,
    lat: float = 10.77,
    lon: float = 106.69,
    place_name: str | None = None,
) -> dict[str, object]:
    """Return a minimal place dict with explicit coordinates for transit tests."""
    return {
        "place_id": place_id,
        "place_name": place_name or f"Place {place_id}",
        "category": category,
        "description": f"Test stop in {district}.",
        "address": f"Street, {district}",
        "district": district,
        "latitude": lat,
        "longitude": lon,
        "estimated_cost": 50_000,
        "photo_url": "",
        "editorial_score": 4.5,
        "is_indoor": True,
        "opening_hours": ["08:00 - 21:00"],
        "suggested_duration": 60,
    }


def _generation_payload(
    places_per_day: int = 3,
    days: int = 1,
    transport_mode: str = "grab_bike",
    **overrides: object,
) -> dict[str, object]:
    """Build a TripGenerationRequest payload with an approved concept."""
    concept = {
        "summary": "Test concept",
        "highlights": ["Place A"],
        "recommended_districts": ["Quận 1"],
        "route_overview": "Quận 1",
        "confirmation_question": "OK?",
    }
    base: dict[str, object] = {
        "start_location": "Quận 1, TP. Hồ Chí Minh",
        "budget": 3_000_000,
        "days": days,
        "districts": ["Quận 1"],
        "places_per_day": places_per_day,
        "companion": "friends",
        "member_count": 3,
        "transport_mode": transport_mode,
        "preferences": ["food", "culture"],
        "pace": "moderate",
        "special_notes": "",
        "approved_concept": concept,
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_suggest_concept_fallback_returns_valid_response() -> None:
    """suggest_concept returns a valid ConceptResponse when no API key is set."""
    from app.schemas.ai import PlaceResponse, TripConceptRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_make_place("p1", "Quận 1", "food")),
        PlaceResponse.model_validate(_make_place("p2", "Quận 1", "cafe")),
        PlaceResponse.model_validate(_make_place("p3", "Quận 1", "sightseeing")),
    ]
    service = GeminiService(api_key=None)
    request = TripConceptRequest.model_validate(_concept_payload())
    concept = await service.suggest_concept(request, places)

    assert concept.source == "fallback"
    assert len(concept.recommended_districts) >= 1
    assert len(concept.highlights) >= 1
    assert concept.summary
    assert concept.confirmation_question


@pytest.mark.asyncio
async def test_generate_itinerary_fills_transit_info_for_second_stop_onwards() -> None:
    """generate_itinerary must set transit_info != None for every stop after the first each day."""
    from app.schemas.ai import PlaceResponse, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    # Use different coordinates so haversine produces a non-zero distance
    places = [
        PlaceResponse.model_validate(
            _make_place("q1-a", "Quận 1", "food", lat=10.7769, lon=106.7009)
        ),
        PlaceResponse.model_validate(
            _make_place("q1-b", "Quận 1", "cafe", lat=10.7800, lon=106.6950)
        ),
        PlaceResponse.model_validate(
            _make_place("q1-c", "Quận 1", "sightseeing", lat=10.7750, lon=106.6980)
        ),
    ]
    service = GeminiService(api_key=None)
    request = TripGenerationRequest.model_validate(
        _generation_payload(places_per_day=3, days=1, transport_mode="grab_bike")
    )
    result = await service.generate_itinerary(request, places)

    assert len(result.itinerary_items) == 3
    assert result.source == "fallback"

    first_item = result.itinerary_items[0]
    assert first_item.transit_info is None, "First stop of a day should have no transit_info"

    for item in result.itinerary_items[1:]:
        assert item.transit_info is not None, (
            f"Stop {item.order_index} (day {item.day_number}) must have transit_info"
        )
        assert item.transit_info.distance_km >= 0
        assert item.transit_info.duration_min >= 1
        assert item.transit_info.mode == "grab_bike"
        assert item.transit_info.estimated_fare_vnd >= 0


@pytest.mark.asyncio
async def test_generate_itinerary_transit_info_uses_correct_transport_mode() -> None:
    """transit_info.mode must match the transport_mode from the request."""
    from app.schemas.ai import PlaceResponse, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_make_place("a", "Quận 1", "food", lat=10.776, lon=106.700)),
        PlaceResponse.model_validate(_make_place("b", "Quận 1", "cafe", lat=10.780, lon=106.695)),
        PlaceResponse.model_validate(
            _make_place("c", "Quận 1", "sightseeing", lat=10.775, lon=106.698)
        ),
    ]
    service = GeminiService(api_key=None)

    for mode in ("walk", "grab_bike", "grab_car", "public"):
        request = TripGenerationRequest.model_validate(_generation_payload(transport_mode=mode))
        result = await service.generate_itinerary(request, places)
        for item in result.itinerary_items[1:]:
            assert item.transit_info is not None
            assert item.transit_info.mode == mode


@pytest.mark.asyncio
async def test_generate_itinerary_walk_mode_fare_is_zero() -> None:
    """When transport_mode is walk, estimated_fare_vnd should be 0."""
    from app.schemas.ai import PlaceResponse, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_make_place("w1", "Quận 1", "food", lat=10.776, lon=106.700)),
        PlaceResponse.model_validate(_make_place("w2", "Quận 1", "cafe", lat=10.780, lon=106.695)),
        PlaceResponse.model_validate(
            _make_place("w3", "Quận 1", "sightseeing", lat=10.775, lon=106.698)
        ),
    ]
    service = GeminiService(api_key=None)
    request = TripGenerationRequest.model_validate(_generation_payload(transport_mode="walk"))
    result = await service.generate_itinerary(request, places)
    for item in result.itinerary_items[1:]:
        assert item.transit_info is not None
        assert item.transit_info.estimated_fare_vnd == 0


@pytest.mark.asyncio
async def test_suggest_swaps_fallback_returns_valid_alternatives() -> None:
    """suggest_swaps returns at least 2 valid alternatives in fallback mode."""
    from app.schemas.ai import ItineraryItemResponse, PlaceResponse, SmartSwapRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(
            _make_place("cur", "Quận 1", "culture", place_name="Current Place")
        ),
        PlaceResponse.model_validate(
            _make_place("alt1", "Quận 1", "culture", place_name="Alternative 1")
        ),
        PlaceResponse.model_validate(
            _make_place("alt2", "Quận 1", "culture", place_name="Alternative 2")
        ),
        PlaceResponse.model_validate(
            _make_place("alt3", "Quận 1", "culture", place_name="Alternative 3")
        ),
    ]
    current_item = ItineraryItemResponse(
        **places[0].model_dump(),
        day_number=1,
        order_index=1,
        time_slot="08:30 - 10:00",
        start_time="08:30",
        end_time="10:00",
    )
    service = GeminiService(api_key=None)
    request = SmartSwapRequest(current_item=current_item, reason="Muốn đổi chỗ")
    result = await service.suggest_swaps(request, places)

    assert result.source == "fallback"
    assert len(result.alternatives) >= 2
    for alt in result.alternatives:
        assert alt.place_id != "cur"
        assert alt.replacement_reason


# ---------------------------------------------------------------------------
# Tests for T-043: prompt size, _shortlist_places, lean generate schema, timeout
# ---------------------------------------------------------------------------


def _load_real_hcmc_catalog() -> list[PlaceResponse]:
    from app.api.v1.endpoints.ai import _to_place_response
    from app.db.hcmc_data import PLACES

    return [
        place
        for place in (_to_place_response(row) for row in PLACES if row.get("is_active", True))
        if place.editorial_score >= 4.0
    ]


def _collect_schema_property_names(node: Any) -> set[str]:
    names: set[str] = set()
    if isinstance(node, dict):
        props = node.get("properties")
        if isinstance(props, dict):
            names.update(props.keys())
        for value in node.values():
            names.update(_collect_schema_property_names(value))
    elif isinstance(node, list):
        for item in node:
            names.update(_collect_schema_property_names(item))
    return names


@pytest.mark.asyncio
@pytest.mark.parametrize(("days", "per_day"), [(2, 4), (14, 6)])
async def test_concept_and_generate_prompts_under_30k_chars_with_real_catalog(
    caplog: pytest.LogCaptureFixture,
    days: int,
    per_day: int,
) -> None:
    from app.schemas.ai import TripConceptRequest, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    catalog = _load_real_hcmc_catalog()
    assert len(catalog) >= 300
    q1_places = [p for p in catalog if p.district == "Quận 1"]

    calls: list[dict[str, Any]] = []

    class _FakeModels:
        def generate_content(self, *, model: str, contents: str, config: dict[str, Any]) -> Any:
            calls.append({"model": model, "contents": contents, "config": config})
            if len(calls) == 1:
                payload = {
                    "summary": "Khám phá Quận 1 hai ngày.",
                    "highlights": [q1_places[0].place_name, q1_places[1].place_name],
                    "recommended_districts": ["Quận 1"],
                    "route_overview": "Quận 1",
                    "confirmation_question": "Bạn đồng ý chứ?",
                }
            else:
                table = contents.split("VERIFIED PLACE CATALOG (pipe-separated):\n")[1]
                rows = table.split("\n\n", 1)[0].splitlines()[1:]
                items = [
                    {
                        "place_id": rows[idx].split("|", 1)[0],
                        "day_number": idx // per_day + 1,
                        "order_index": idx % per_day + 1,
                        "start_time": "08:30",
                        "end_time": "10:00",
                        "is_lunch": (idx % per_day + 1) == 3,
                    }
                    for idx in range(days * per_day)
                ]
                payload = {"itinerary_items": items}

            class _Resp:
                text = json.dumps(payload, ensure_ascii=False)

            return _Resp()

    class _FakeClient:
        models = _FakeModels()

    # Tách chuỗi để hook pre-commit không coi là key thật.
    fake_key = "AI" + "za" + "FakeSecretKey12345678901234567890"
    service = GeminiService(api_key=fake_key, client=_FakeClient())
    concept_req = TripConceptRequest.model_validate(
        _concept_payload(
            days=days,
            places_per_day=per_day,
            preferences=["food", "culture"],
            interests=["street_food", "history", "chinatown", "riverside", "markets"],
            vibe_energy=75,
            vibe_spend=33,
        )
    )

    with caplog.at_level(logging.INFO, logger="app.services.gemini_service"):
        concept = await service.suggest_concept(concept_req, catalog)
        gen_req = TripGenerationRequest(
            **concept_req.model_dump(),
            approved_concept=concept,
        )
        itinerary = await service.generate_itinerary(gen_req, catalog)

    assert concept.source == "gemini"
    assert itinerary.source == "gemini"
    assert len(itinerary.itinerary_items) == days * per_day
    assert len(calls) == 2

    concept_prompt = calls[0]["contents"]
    generate_prompt = calls[1]["contents"]
    assert len(concept_prompt) <= 30_000
    assert len(generate_prompt) <= 30_000
    assert "images.unsplash.com" not in concept_prompt
    assert "images.unsplash.com" not in generate_prompt
    assert "photo_url" not in concept_prompt
    assert "photo_url" not in generate_prompt

    info_messages = [r.message for r in caplog.records if r.levelno == logging.INFO]
    for step, prompt in (("concept", concept_prompt), ("generate", generate_prompt)):
        assert "Sở thích: Ăn vặt đường phố" in prompt
        assert "khám phá nhiều" in prompt and "ưu tiên bình dân" in prompt
        table = prompt.split("VERIFIED PLACE CATALOG (pipe-separated):\n")[1].split("\n\n", 1)[0]
        header, *rows = table.splitlines()
        assert header.split("|") == [
            "place_id",
            "place_name",
            "category",
            "district",
            "estimated_cost",
            "is_indoor",
            "opening_hours",
            "editorial_score",
            "lat",
            "lng",
        ]
        by_id = {p.place_id: p for p in catalog}
        for row in rows:
            fields = row.split("|")
            assert len(fields) == 10
            place = by_id[fields[0]]
            assert fields[-2:] == [f"{place.latitude:.3f}", f"{place.longitude:.3f}"]
        if step == "concept":
            assert len(rows) == 80
        assert any(
            f"step={step} places={len(rows)} prompt_chars={len(prompt)} elapsed_ms=" in m
            and "source=gemini" in m
            for m in info_messages
        )
    assert all(fake_key not in m and "TRAVELER REQUEST" not in m for m in info_messages)


def test_shortlist_places_keeps_must_visit_categories_and_approved_districts() -> None:
    from app.schemas.ai import ConceptResponse, PlaceResponse, TripGenerationRequest
    from app.services.gemini_service import _shortlist_places

    catalog = _load_real_hcmc_catalog()
    q7_must = next(p for p in catalog if p.district == "Quận 7")
    concept = ConceptResponse(
        summary="Chỉ đi Quận 1",
        highlights=[q7_must.place_name],
        recommended_districts=["Quận 1"],
        route_overview="Quận 1",
        confirmation_question="OK?",
    )
    gen_req = TripGenerationRequest.model_validate(
        {
            **_concept_payload(
                days=2,
                places_per_day=4,
                districts=["Quận 1", "Quận 3"],
                preferences=["food"],
                must_visit_ids=[q7_must.place_id],
            ),
            "approved_concept": concept.model_dump(),
        }
    )

    shortlisted = _shortlist_places(gen_req, catalog, limit=40)
    shortlisted_ids = {p.place_id for p in shortlisted}
    categories = {p.category for p in shortlisted}

    assert q7_must.place_id in shortlisted_ids
    assert len(shortlisted) >= gen_req.days * gen_req.places_per_day
    assert len(shortlisted) <= 40
    assert "food" in categories
    assert "sightseeing" in categories
    assert all(p.district == "Quận 1" or p.place_id == q7_must.place_id for p in shortlisted)

    # When approved district has fewer stops than days * places_per_day, relax to full catalog.
    sparse_places = [
        PlaceResponse.model_validate(_sample_place("q1-only-1", "Quận 1", "food")),
        PlaceResponse.model_validate(_sample_place("q1-only-2", "Quận 1", "sightseeing")),
        *[
            PlaceResponse.model_validate(
                _sample_place(
                    f"q3-{idx}",
                    "Quận 3",
                    "food" if idx % 2 == 0 else "sightseeing",
                )
            )
            for idx in range(8)
        ],
    ]
    relaxed_req = TripGenerationRequest.model_validate(
        {
            **_concept_payload(days=2, places_per_day=4, districts=["Quận 1"]),
            "approved_concept": concept.model_dump(),
        }
    )
    relaxed = _shortlist_places(relaxed_req, sparse_places, limit=40)
    assert len(relaxed) >= 8
    assert {"q1-only-1", "q1-only-2"}.issubset({p.place_id for p in relaxed})
    assert any(p.district == "Quận 3" for p in relaxed)


@pytest.mark.asyncio
async def test_shortlist_uses_db_tags_and_original_categories_before_rating(test_database):
    from app.api.v1.endpoints.ai import _load_catalog
    from app.db.models import Place
    from app.schemas.ai import TripConceptRequest
    from app.services.gemini_service import _shortlist_places
    from app.services.interests import interest_score
    from app.services.places_service import search_places

    fixtures = [
        ("mandatory", "shopping", [], 4.0),
        ("tag-and-category", "culture", ["tôn giáo"], 4.0),
        ("category-only", "culture", [], 4.6),
        ("tag-only", "attraction", ["Di tích TÔN GIÁO"], 4.5),
        ("high-rating", "attraction", [], 5.0),
        ("meal", "food", [], 4.1),
        ("coffee", "cafe", [], 4.1),
    ]
    _, factory = test_database
    async with factory() as db:
        for pid, category, tags, rating in fixtures:
            db.add(
                Place(
                    id=pid,
                    name=pid,
                    address="TP.HCM",
                    district="Quận 1",
                    latitude=10.7,
                    longitude=106.7,
                    category=category,
                    tags=json.dumps(tags),
                    average_rating=rating,
                )
            )
        await db.commit()
        catalog = await _load_catalog(db)
        # The catalog retains its own metadata even after a different search in the same task.
        await search_places(db, district="Quận 3")

    request = TripConceptRequest.model_validate(
        _concept_payload(interests=["temples_churches"], must_visit_ids=["mandatory"])
    )
    shortlisted = _shortlist_places(request, catalog, limit=6)
    assert [p.place_id for p in shortlisted] == [
        "mandatory",
        "tag-and-category",
        "category-only",
        "tag-only",
        "coffee",
        "meal",
    ]
    assert shortlisted[1].category == "sightseeing"
    assert interest_score(shortlisted[1], request.interests) == 1.5
    assert {"tags", "catalog_category"}.isdisjoint(shortlisted[1].model_dump())


@pytest.mark.asyncio
async def test_generate_schema_excludes_place_fields_and_grounds_response() -> None:
    from app.schemas.ai import PlaceResponse, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_make_place("q1-1", "Quận 1", "sightseeing", lat=10.776)),
        PlaceResponse.model_validate(_make_place("q1-2", "Quận 1", "cafe", lat=10.779)),
        PlaceResponse.model_validate(_make_place("q1-3", "Quận 1", "food", lat=10.781)),
    ]
    captured_schemas: list[dict[str, Any]] = []

    class _FakeModels:
        def generate_content(self, *, model: str, contents: str, config: dict[str, Any]) -> Any:
            captured_schemas.append(config["response_json_schema"])
            payload = {
                "itinerary_items": [
                    {
                        "place_id": places[idx].place_id,
                        "day_number": 1,
                        "order_index": idx + 1,
                        "start_time": f"{8 + idx * 2:02}:30",
                        "end_time": f"{10 + idx * 2}:00",
                        "is_lunch": idx == 2,
                    }
                    for idx in range(3)
                ]
            }

            class _Resp:
                text = json.dumps(payload)

            return _Resp()

    class _FakeClient:
        models = _FakeModels()

    service = GeminiService(client=_FakeClient())
    req = TripGenerationRequest.model_validate(_generation_payload(days=1, places_per_day=3))
    result = await service.generate_itinerary(req, places)

    assert len(captured_schemas) == 1
    prop_names = _collect_schema_property_names(captured_schemas[0])
    assert {"place_id", "day_number", "order_index", "start_time", "end_time"}.issubset(prop_names)
    forbidden_fields = {
        "description",
        "address",
        "photo_url",
        "place_name",
        "category",
        "district",
        "latitude",
        "longitude",
        "estimated_cost",
        "editorial_score",
        "is_indoor",
        "opening_hours",
        "suggested_duration",
        "transit_info",
    }
    assert prop_names.isdisjoint(forbidden_fields)

    assert result.source == "gemini"
    assert [it.place_name for it in result.itinerary_items] == [p.place_name for p in places]
    assert all(it.description and it.address for it in result.itinerary_items)
    assert result.itinerary_items[1].transit_info is not None


@pytest.mark.asyncio
async def test_gemini_timeout_falls_back_within_timeout_times_attempts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import time

    from app.schemas.ai import PlaceResponse, TripConceptRequest
    from app.services.gemini_service import GeminiService

    monkeypatch.setenv("GEMINI_TIMEOUT_SECONDS", "17.5")
    assert GeminiService(api_key=None).timeout_seconds == 17.5
    monkeypatch.delenv("GEMINI_TIMEOUT_SECONDS", raising=False)
    assert GeminiService(api_key=None).timeout_seconds == 25.0

    places = [
        PlaceResponse.model_validate(_make_place("p1", "Quận 1", "food")),
        PlaceResponse.model_validate(_make_place("p2", "Quận 1", "cafe")),
        PlaceResponse.model_validate(_make_place("p3", "Quận 1", "sightseeing")),
    ]
    call_count = 0

    class _SlowModels:
        def generate_content(self, **kwargs: Any) -> Any:
            nonlocal call_count
            call_count += 1
            time.sleep(0.25)
            raise AssertionError("Should have timed out before returning")

    class _SlowClient:
        models = _SlowModels()

    timeout_s = 0.08
    attempts = 3
    service = GeminiService(
        client=_SlowClient(),
        timeout_seconds=timeout_s,
        max_attempts=attempts,
    )
    req = TripConceptRequest.model_validate(_concept_payload())

    t0 = time.perf_counter()
    result = await service.suggest_concept(req, places)
    elapsed = time.perf_counter() - t0

    assert result.source == "fallback"
    assert call_count == attempts
    assert elapsed <= timeout_s * attempts + 0.25


@pytest.mark.asyncio
async def test_generate_rejects_catalog_id_outside_approved_shortlist() -> None:
    from unittest.mock import AsyncMock, patch

    from app.schemas.ai import ItineraryPlanItem, ItineraryPlanResponse, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    req = TripGenerationRequest.model_validate(_generation_payload())
    places = [
        PlaceResponse.model_validate(_sample_place(f"q1-{i}", "Quận 1")) for i in range(3)
    ] + [PlaceResponse.model_validate(_sample_place("q3", "Quận 3"))]
    plan = ItineraryPlanResponse(
        itinerary_items=[
            ItineraryPlanItem(
                place_id=pid, day_number=1, order_index=i, start_time="09:00", end_time="10:00"
            )
            for i, pid in enumerate(["q1-0", "q1-1", "q3"], start=1)
        ]
    )
    service = GeminiService()
    with patch.object(service, "_generate", new=AsyncMock(return_value=plan)):
        result = await service.generate_itinerary(req, places)
    assert result.source == "fallback"
    assert {item.place_id for item in result.itinerary_items} == {"q1-0", "q1-1", "q1-2"}


@pytest.mark.asyncio
@pytest.mark.parametrize("queue", ["concurrency", "rate"])
async def test_total_deadline_includes_queue_time(queue: str) -> None:
    import asyncio
    from unittest.mock import Mock

    from app.schemas.ai import TripConceptRequest
    from app.services.gemini_service import GeminiService

    client = Mock()
    service = GeminiService(
        client=client, max_total_seconds=0.05, max_concurrent_requests=1, requests_per_minute=1
    )
    req = TripConceptRequest.model_validate(_concept_payload())
    places = [PlaceResponse.model_validate(_sample_place("q1", "Quận 1"))]

    async def queued_call():
        return await asyncio.wait_for(service.suggest_concept(req, places), timeout=0.3)

    if queue == "rate":
        await service._wait_for_rate_slot()
        result = await queued_call()
    else:
        async with service._semaphore:
            result = await queued_call()

    assert result.source == "fallback"
    client.models.generate_content.assert_not_called()


@pytest.mark.asyncio
async def test_sdk_sends_lean_schema_and_transport_timeout_without_internal_retry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import httpx
    from google import genai

    from app.schemas.ai import TripGenerationRequest
    from app.services.gemini_service import GeminiService

    calls: list[httpx.Request] = []

    def unavailable(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(503, json={"error": {"code": 503, "message": "unavailable"}})

    sdk_client = genai.Client
    async with httpx.AsyncClient(transport=httpx.MockTransport(unavailable)) as transport:

        def make_client(api_key, http_options):
            return sdk_client(
                api_key=api_key, http_options={**http_options, "httpx_async_client": transport}
            )

        monkeypatch.setattr(genai, "Client", make_client)
        service = GeminiService(api_key="test-only", timeout_seconds=0.5, max_attempts=1)
        places = [
            PlaceResponse.model_validate(_sample_place(f"q1-{i}", "Quận 1")) for i in range(3)
        ]
        req = TripGenerationRequest.model_validate(_generation_payload())
        try:
            result = await service.generate_itinerary(req, places)
        finally:
            await service._client.aio.aclose()
            service._client.close()

    assert result.source == "fallback"
    assert len(calls) == 1
    assert calls[0].extensions["timeout"]["read"] == 0.5
    config = json.loads(calls[0].content)["generationConfig"]
    assert "place_id" in _collect_schema_property_names(config["responseJsonSchema"])
    assert "photo_url" not in _collect_schema_property_names(config["responseJsonSchema"])


@pytest.mark.asyncio
@pytest.mark.parametrize("reason", ["Exceeded your current quota", "GenerateRequestsPerDay"])
async def test_quota_fallback_and_circuit_expiry(monkeypatch, caplog, reason):
    from types import SimpleNamespace
    from unittest.mock import Mock

    from app.schemas.ai import TripConceptRequest
    from app.services import gemini_service

    now = 100.0

    async def advance(seconds):
        nonlocal now
        now += seconds

    monkeypatch.setattr(
        gemini_service, "time", SimpleNamespace(monotonic=lambda: now, perf_counter=lambda: now)
    )
    monkeypatch.setattr(gemini_service.asyncio, "sleep", advance)
    caplog.set_level(logging.INFO, logger=gemini_service.__name__)
    error = RuntimeError(f"RESOURCE_EXHAUSTED: {reason}\nkey=test-secret")
    error.code = 429
    client = Mock()
    client.models.generate_content.side_effect = error
    service = gemini_service.GeminiService(client=client)
    request = TripConceptRequest.model_validate(_concept_payload())
    places = [PlaceResponse.model_validate(_sample_place("q1", "Quận 1"))]

    started = now
    assert (await service.suggest_concept(request, places)).source == "fallback"
    assert now - started < 1
    assert client.models.generate_content.call_count == 1
    warnings = [record.message for record in caplog.records if record.levelno == logging.WARNING]
    assert len(warnings) == 1 and "\n" not in warnings[0]
    assert "test-secret" not in caplog.text

    now = started + 59.9
    assert (await service.suggest_concept(request, places)).source == "fallback"
    assert client.models.generate_content.call_count == 1
    assert "quota circuit open" in caplog.text

    now = started + 60
    assert (await service.suggest_concept(request, places)).source == "fallback"
    assert client.models.generate_content.call_count == 2


@pytest.mark.asyncio
async def test_transient_rate_limit_retries_once_with_capped_backoff(monkeypatch):
    from unittest.mock import AsyncMock, Mock

    from app.schemas.ai import TripConceptRequest
    from app.services import gemini_service

    class TooManyRequests(Exception):
        pass

    client = Mock()
    client.models.generate_content.side_effect = TooManyRequests("Try again shortly")
    service = gemini_service.GeminiService(client=client, retry_base_seconds=10)
    sleep = AsyncMock()
    monkeypatch.setattr(gemini_service.asyncio, "sleep", sleep)
    request = TripConceptRequest.model_validate(_concept_payload())
    places = [PlaceResponse.model_validate(_sample_place("q1", "Quận 1"))]

    assert (await service.suggest_concept(request, places)).source == "fallback"
    assert client.models.generate_content.call_count == 2
    sleep.assert_awaited_once_with(2.0)


def test_trip_concept_schema_validates_day_schedules() -> None:
    from app.schemas.ai import TripConceptRequest

    valid = TripConceptRequest.model_validate(
        _concept_payload(
            days=2,
            day_schedules=[
                {"day_number": 1, "day_start": "16:00", "day_end": "23:00"},
                {"day_number": 2, "day_start": "08:00", "day_end": "20:00"},
            ],
        )
    )
    assert len(valid.day_schedules) == 2

    with pytest.raises(ValidationError):
        TripConceptRequest.model_validate(
            _concept_payload(
                days=2,
                day_schedules=[
                    {"day_number": 1, "day_start": "16:00", "day_end": "23:00"},
                    {"day_number": 1, "day_start": "08:00", "day_end": "20:00"},
                ],
            )
        )

    with pytest.raises(ValidationError):
        TripConceptRequest.model_validate(
            _concept_payload(
                days=1,
                day_schedules=[{"day_number": 2, "day_start": "08:00", "day_end": "20:00"}],
            )
        )


@pytest.mark.asyncio
async def test_fallback_itinerary_honors_per_day_schedules_and_group_cars() -> None:
    from app.schemas.ai import PlaceResponse, TripConceptRequest, TripGenerationRequest
    from app.services.gemini_service import GeminiService

    places = [
        PlaceResponse.model_validate(_sample_place(f"q1-{i}", "Quận 1", "food"))
        for i in range(1, 7)
    ]
    service = GeminiService(api_key=None)
    concept = await service.suggest_concept(
        TripConceptRequest.model_validate(
            _concept_payload(
                days=2,
                member_count=6,
                transport_mode="grab_car",
                places_per_day=3,
                day_schedules=[{"day_number": 1, "day_start": "16:00", "day_end": "23:00"}],
            )
        ),
        places,
    )
    gen_req = TripGenerationRequest.model_validate(
        {
            **_concept_payload(
                days=2,
                member_count=6,
                transport_mode="grab_car",
                places_per_day=3,
                day_schedules=[{"day_number": 1, "day_start": "16:00", "day_end": "23:00"}],
            ),
            "approved_concept": concept.model_dump(),
        }
    )
    generated = await service.generate_itinerary(gen_req, places)

    day1_items = [item for item in generated.itinerary_items if item.day_number == 1]
    day2_items = [item for item in generated.itinerary_items if item.day_number == 2]
    assert day1_items[0].start_time == "16:00"
    assert day2_items[0].start_time == "08:30"

    # 6 members require 2 cars (cars_needed == 2) -> estimated_fare_vnd scales accordingly
    leg2 = day1_items[1].transit_info
    assert leg2 is not None
    assert leg2.cars_needed == 2
    assert leg2.estimated_fare_vnd >= 64000
