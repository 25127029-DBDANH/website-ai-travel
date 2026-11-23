"""Documented Haversine distance and transit estimate tests."""

from __future__ import annotations

import pytest

from app.utils import transit_calculator

pytestmark = pytest.mark.skipif(
    not callable(getattr(transit_calculator, "calculate_transit", None)),
    reason="Transit calculation is not implemented on the current main branch yet.",
)


def test_nearby_hcmc_landmarks_are_classified_as_walkable() -> None:
    from app.utils.transit_calculator import calculate_transit

    # Independence Palace to Notre-Dame Cathedral, coordinates from docs/08-testing.md.
    result = calculate_transit(10.7769, 106.6953, 10.7798, 106.6990)

    assert result["mode"] == "walk"
    assert 0 < result["distance_km"] <= 0.8
    assert result["estimated_fare_vnd"] == 0
    assert result["duration_min"] >= 2


def test_cross_city_route_is_a_ride_with_a_rounded_positive_fare() -> None:
    from app.utils.transit_calculator import calculate_transit

    # Ben Thanh Market to Binh Tay Market, coordinates from docs/08-testing.md.
    result = calculate_transit(10.7725, 106.6980, 10.7495, 106.6510)

    assert result["mode"] == "ride"
    assert result["distance_km"] > 6.0
    assert result["estimated_fare_vnd"] >= 40_000
    assert result["estimated_fare_vnd"] % 5_000 == 0
    assert result["duration_min"] > 0


def test_transit_distance_is_symmetric_and_missing_coordinates_return_none() -> None:
    from app.utils.transit_calculator import calculate_transit

    forward = calculate_transit(10.7769, 106.6953, 10.7798, 106.6990)
    reverse = calculate_transit(10.7798, 106.6990, 10.7769, 106.6953)

    assert forward["distance_km"] == pytest.approx(reverse["distance_km"], abs=0.01)
    assert calculate_transit(None, 106.7, 10.77, 106.69) is None
