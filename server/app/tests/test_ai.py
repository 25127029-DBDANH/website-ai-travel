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
