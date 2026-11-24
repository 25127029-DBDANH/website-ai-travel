"""Structured AI schema tests that do not call Gemini."""

from __future__ import annotations

import pytest
from pydantic import ValidationError


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


def _sample_place(place_id: str, district: str, category: str = "food") -> dict[str, object]:
    return {
        "place_id": place_id,
        "place_name": f"Place {place_id}",
        "category": category,
        "description": f"Verified local stop in {district}.",
        "address": f"123 Street, {district}",
        "district": district,
        "latitude": 10.77,
        "longitude": 106.69,
        "estimated_cost": 60_000,
        "photo_url": "",
        "editorial_score": 4.6,
        "is_indoor": True,
        "opening_hours": ["08:00 - 21:00"],
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
