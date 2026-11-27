"""
utils package — Helper utilities for HCMC AI Travel Planner.
"""

from app.utils.transit_calculator import (
    FARE_RULES,
    InvalidCoordinateError,
    InvalidDistanceError,
    TransitError,
    VehicleFare,
    VehiclePricing,
    build_ride_deep_link,
    calculate_single_fare,
    calculate_transit,
    estimate_ride_fares,
    haversine_km,
)

__all__ = [
    "FARE_RULES",
    "InvalidCoordinateError",
    "InvalidDistanceError",
    "TransitError",
    "VehicleFare",
    "VehiclePricing",
    "build_ride_deep_link",
    "calculate_single_fare",
    "calculate_transit",
    "estimate_ride_fares",
    "haversine_km",
]
