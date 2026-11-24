"""Structured AI schema tests that do not call Gemini."""

from __future__ import annotations

import importlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
import pytest_asyncio
from httpx import AsyncClient
from pydantic import ValidationError

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
