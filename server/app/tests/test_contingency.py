"""
test_contingency.py — Unit tests for rush-hour and rainy contingency scenarios.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from datetime import time

import pytest

from app.services.contingency_service import (
    RAIN_COVERED_VEHICLES,
    RUSH_HOUR_BUFFER_MINUTES,
    adapt_itinerary_items,
    adapt_transit_info,
    apply_rush_hour_buffer,
    filter_indoor_places,
    get_rain_transport_modes,
    is_rush_hour,
)


# ---------------------------------------------------------------------------
# Rush Hour Tests
# ---------------------------------------------------------------------------
def test_is_rush_hour_boundary_conditions():
    """Test inclusive/exclusive boundary conditions for 17:00 - 19:00 rush hour."""
    # Before rush hour
    assert not is_rush_hour(time(16, 59, 59))
    assert not is_rush_hour(time(12, 0))
    assert not is_rush_hour(time(8, 30))

    # Exactly start of rush hour (17:00:00 is inclusive)
    assert is_rush_hour(time(17, 0, 0))

    # Inside rush hour
    assert is_rush_hour(time(17, 30, 0))
    assert is_rush_hour(time(18, 0, 0))
    assert is_rush_hour(time(18, 59, 59))

    # End of rush hour (19:00:00 is exclusive)
    assert not is_rush_hour(time(19, 0, 0))
    assert not is_rush_hour(time(19, 0, 1))
    assert not is_rush_hour(time(21, 30))


def test_apply_rush_hour_buffer():
    """Transit duration must receive +20 minutes during rush hour and remain unchanged outside."""
    # Outside rush hour (14:00)
    assert apply_rush_hour_buffer(15, time(14, 0)) == 15

    # During rush hour (17:45)
    assert apply_rush_hour_buffer(15, time(17, 45)) == 15 + RUSH_HOUR_BUFFER_MINUTES
    assert apply_rush_hour_buffer(30, time(18, 15)) == 50

    # Negative duration must raise ValueError
    with pytest.raises(ValueError):
        apply_rush_hour_buffer(-5, time(17, 30))


# ---------------------------------------------------------------------------
# Indoor Places Filtering Tests
# ---------------------------------------------------------------------------
def test_filter_indoor_places_with_dicts():
    """filter_indoor_places must retain only items with is_indoor == True."""
    places = [
        {"name": "Dinh Độc Lập", "is_indoor": True},
        {"name": "Phố đi bộ Nguyễn Huệ", "is_indoor": False},
        {"name": "Bảo tàng Mỹ thuật", "is_indoor": True},
        {"name": "Bến Bạch Đằng", "is_indoor": False},
    ]

    indoor = filter_indoor_places(places)
    assert len(indoor) == 2
    assert [p["name"] for p in indoor] == ["Dinh Độc Lập", "Bảo tàng Mỹ thuật"]


def test_filter_indoor_places_empty():
    """Empty list returns empty list."""
    assert filter_indoor_places([]) == []


def test_filter_indoor_places_objects():
    """filter_indoor_places should work with objects having is_indoor attribute."""

    class DummyPlace:
        def __init__(self, name: str, is_indoor: bool):
            self.name = name
            self.is_indoor = is_indoor

    p1 = DummyPlace("Museum", True)
    p2 = DummyPlace("Park", False)
    assert filter_indoor_places([p1, p2]) == [p1]


# ---------------------------------------------------------------------------
# Rain Transport Modes Tests
# ---------------------------------------------------------------------------
def test_get_rain_transport_modes():
    """Must return the list of covered vehicle options."""
    modes = get_rain_transport_modes()
    assert set(modes) == set(RAIN_COVERED_VEHICLES)
    assert "GrabCar" in modes
    assert "Taxi điện" in modes
    assert "BeCar" in modes


# ---------------------------------------------------------------------------
# Adaptive Transit Info Tests
# ---------------------------------------------------------------------------
def test_adapt_transit_info_rain():
    """Rain condition switches mode to covered car and applies fare adjustment."""
    transit = {
        "mode": "grab_bike",
        "duration_min": 15,
        "estimated_fare_vnd": 18000,
    }

    adapted = adapt_transit_info(transit, current_time=time(14, 0), is_raining=True)
    assert adapted["is_rain_mode"] is True
    assert adapted["mode"] == "grab_car"
    assert adapted["estimated_fare_vnd"] >= 35000
    assert adapted["is_rush_hour"] is False
    assert adapted["duration_min"] == 15


def test_adapt_transit_info_rush_hour():
    """Rush hour adds 20 minutes buffer and sets is_rush_hour flag."""
    transit = {
        "mode": "grab_bike",
        "duration_min": 15,
        "estimated_fare_vnd": 18000,
    }

    adapted = adapt_transit_info(transit, current_time=time(17, 30), is_raining=False)
    assert adapted["is_rush_hour"] is True
    assert adapted["duration_min"] == 35
    assert adapted["is_rain_mode"] is False


def test_adapt_transit_info_rain_and_rush_hour():
    """Both rain and rush hour active simultaneously."""
    transit = {
        "mode": "grab_bike",
        "duration_min": 20,
        "estimated_fare_vnd": 20000,
    }

    adapted = adapt_transit_info(transit, current_time=time(18, 0), is_raining=True)
    assert adapted["is_rush_hour"] is True
    assert adapted["duration_min"] == 40
    assert adapted["is_rain_mode"] is True
    assert adapted["mode"] == "grab_car"


def test_adapt_itinerary_items_filter_outdoor():
    """adapt_itinerary_items with filter_outdoor=True removes outdoor activities during rain."""
    items = [
        {
            "place_name": "Bảo tàng",
            "is_indoor": True,
            "transit_info": {"duration_min": 10},
        },
        {
            "place_name": "Công viên",
            "is_indoor": False,
            "transit_info": {"duration_min": 10},
        },
    ]

    filtered = adapt_itinerary_items(items, is_raining=True, filter_outdoor=True)
    assert len(filtered) == 1
    assert filtered[0]["place_name"] == "Bảo tàng"


def test_adapt_transit_info_idempotent():
    """Repeated calls to adapt_transit_info must not multiply fare or add buffer repeatedly."""
    initial_transit = {
        "mode": "grab_bike",
        "duration_min": 15,
        "estimated_fare_vnd": 30000,
        "is_rain_mode": False,
        "is_rush_hour": False,
    }

    # First call with rain and rush hour
    first_call = adapt_transit_info(
        initial_transit, current_time=time(17, 30), is_raining=True
    )
    expected_fare = max(35000, round(30000 * 1.5))
    expected_duration = 15 + RUSH_HOUR_BUFFER_MINUTES
    assert first_call["estimated_fare_vnd"] == expected_fare
    assert first_call["duration_min"] == expected_duration
    assert first_call["is_rain_mode"] is True
    assert first_call["is_rush_hour"] is True

    # Second call on already adapted object
    second_call = adapt_transit_info(
        first_call, current_time=time(17, 30), is_raining=True
    )
    assert second_call["estimated_fare_vnd"] == expected_fare
    assert second_call["duration_min"] == expected_duration
    assert second_call["is_rain_mode"] is True
    assert second_call["is_rush_hour"] is True

    # Third call
    third_call = adapt_transit_info(
        second_call, current_time=time(17, 30), is_raining=True
    )
    assert third_call == second_call
