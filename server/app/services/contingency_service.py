"""
contingency_service.py — Adaptive contingency scenarios (rush-hour traffic & rain).
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

from datetime import time
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RUSH_HOUR_START: time = time(17, 0)
RUSH_HOUR_END: time = time(19, 0)
RUSH_HOUR_BUFFER_MINUTES: int = 20

# ASSUMPTION: Các loại xe có mái che phù hợp di chuyển trời mưa Sài Gòn
RAIN_COVERED_VEHICLES: tuple[str, ...] = ("GrabCar", "Taxi điện", "BeCar")
RAIN_DEFAULT_MODE: str = "grab_car"


# ---------------------------------------------------------------------------
# Pure Evaluation Functions
# ---------------------------------------------------------------------------
def is_rush_hour(current_time: time) -> bool:
    """
    Check whether a given time falls within the HCMC afternoon rush-hour window.
    Window is [17:00, 19:00): 17:00 inclusive, 19:00 exclusive.

    Args:
        current_time: The time to evaluate.

    Returns:
        True if current_time is between 17:00:00 and 18:59:59.999999, False otherwise.
    """
    return RUSH_HOUR_START <= current_time < RUSH_HOUR_END


def apply_rush_hour_buffer(duration_minutes: int, current_time: time) -> int:
    """
    Apply a 20-minute traffic buffer to the transit duration if within rush hour.

    Args:
        duration_minutes: Estimated baseline travel time in minutes.
        current_time: Injected current time.

    Returns:
        Duration in minutes, increased by 20 during rush hour.

    Raises:
        ValueError: If duration_minutes is negative.
    """
    if duration_minutes < 0:
        raise ValueError(f"duration_minutes cannot be negative: {duration_minutes}")

    if is_rush_hour(current_time):
        return duration_minutes + RUSH_HOUR_BUFFER_MINUTES
    return duration_minutes


def filter_indoor_places(
    places: list[dict[str, Any] | Any],
) -> list[dict[str, Any] | Any]:
    """
    Filter a list of places to return only indoor destinations (is_indoor == True).

    Supports both dictionary objects with key 'is_indoor' and object instances
    with attribute 'is_indoor'.

    Args:
        places: List of place dictionaries or objects.

    Returns:
        Filtered list containing only indoor locations.
    """
    indoor_places = []
    for place in places:
        if isinstance(place, dict):
            if place.get("is_indoor") is True:
                indoor_places.append(place)
        else:
            if getattr(place, "is_indoor", False) is True:
                indoor_places.append(place)
    return indoor_places


def get_rain_transport_modes() -> list[str]:
    """
    Get recommended covered transport modes when it rains.

    Returns:
        List of vehicle type names with roof/weather shielding.
    """
    return list(RAIN_COVERED_VEHICLES)


def adapt_transit_info(
    transit_info: dict[str, Any],
    current_time: time | None = None,
    is_raining: bool = False,
) -> dict[str, Any]:
    """
    Adapt a single transit_info dictionary for weather and rush-hour conditions.

    Args:
        transit_info: Dictionary containing transit attributes
                      (e.g., duration_min, mode, estimated_fare_vnd).
        current_time: Optional time of transit. If provided and within rush hour,
                      adds 20 minutes buffer and sets is_rush_hour=True.
        is_raining: If True, switches to covered car mode and sets is_rain_mode=True.

    Returns:
        A new adapted transit_info dictionary.
    """
    adapted = dict(transit_info)
    original_duration = int(adapted.get("duration_min", 15))

    # Rush-hour buffer
    if current_time is not None and is_rush_hour(current_time):
        if not adapted.get("is_rush_hour", False):
            adapted["duration_min"] = original_duration + RUSH_HOUR_BUFFER_MINUTES
        adapted["is_rush_hour"] = True
    else:
        adapted["is_rush_hour"] = False

    # Rain mode
    if is_raining:
        # Idempotent: lưu giá & mode gốc trước khi chuyển sang xe có mái che + nhân 1.5x
        if not adapted.get("is_rain_mode", False):
            original_fare = int(adapted.get("estimated_fare_vnd", 20000))
            adapted["original_fare_vnd"] = original_fare
            adapted["original_mode"] = str(adapted.get("mode") or "grab_bike")
            adapted["estimated_fare_vnd"] = max(35000, round(original_fare * 1.5))
        adapted["mode"] = RAIN_DEFAULT_MODE
        adapted["is_rain_mode"] = True
    else:
        adapted["is_rain_mode"] = False

    return adapted


def adapt_itinerary_items(
    items: list[dict[str, Any]],
    current_time: time | None = None,
    is_raining: bool = False,
    filter_outdoor: bool = False,
) -> list[dict[str, Any]]:
    """
    Adapt a list of itinerary items based on weather and traffic conditions.

    Args:
        items: List of itinerary activity dictionaries.
        current_time: Time to check for rush hour.
        is_raining: Whether it is currently raining.
        filter_outdoor: If True and is_raining is True, excludes outdoor places.

    Returns:
        Adapted list of itinerary activity dictionaries.
    """
    adapted_items: list[dict[str, Any]] = []

    for item in items:
        # Check if outdoor item should be filtered out
        if is_raining and filter_outdoor and not item.get("is_indoor", False):
            continue

        item_copy = dict(item)
        if "transit_info" in item_copy and isinstance(item_copy["transit_info"], dict):
            item_copy["transit_info"] = adapt_transit_info(
                item_copy["transit_info"],
                current_time=current_time,
                is_raining=is_raining,
            )

        adapted_items.append(item_copy)

    return adapted_items
