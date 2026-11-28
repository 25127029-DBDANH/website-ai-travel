"""
transit_calculator.py — Pure functions for GPS Haversine distance and ride fare estimation.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
EARTH_RADIUS_KM: float = 6371.0
ROAD_DISTANCE_FACTOR: float = 1.3
WALK_THRESHOLD_KM: float = 0.5


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------
class TransitError(Exception):
    """Base exception for transit and calculation errors."""


class InvalidCoordinateError(TransitError, ValueError):
    """Raised when latitude or longitude is outside valid physical range."""


class InvalidDistanceError(TransitError, ValueError):
    """Raised when distance is negative or invalid."""


# ---------------------------------------------------------------------------
# Pricing Configuration (Dataclass)
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class VehiclePricing:
    """Pricing matrix for a single vehicle type."""

    brand: str
    vehicle_type: str
    base_fare_vnd: int  # Cước mở cửa / chặng đầu
    base_km: float  # Số km đầu tiên áp dụng giá mở cửa
    per_km_vnd: int  # Giá cước cho mỗi km tiếp theo
    min_fare_vnd: int  # Cước tối thiểu cho chuyến đi


# ASSUMPTION: Biểu giá tham khảo thị trường TP.HCM (Grab, Xanh SM, Be) giai đoạn 2024-2026.
# Cần kiểm tra và đối chiếu lại với biểu giá chính thức thời gian thực của từng hãng.
FARE_RULES: tuple[VehiclePricing, ...] = (
    # ── Grab ───────────────────────────────────────────────────────────────
    VehiclePricing(
        brand="Grab",
        vehicle_type="GrabBike",
        base_fare_vnd=13800,
        base_km=2.0,
        per_km_vnd=4800,
        min_fare_vnd=13800,
    ),
    VehiclePricing(
        brand="Grab",
        vehicle_type="GrabCar",
        base_fare_vnd=32000,
        base_km=2.0,
        per_km_vnd=12000,
        min_fare_vnd=32000,
    ),
    # ── Xanh SM ────────────────────────────────────────────────────────────
    VehiclePricing(
        brand="Xanh SM",
        vehicle_type="Bike điện",
        base_fare_vnd=14500,
        base_km=2.0,
        per_km_vnd=4800,
        min_fare_vnd=14500,
    ),
    VehiclePricing(
        brand="Xanh SM",
        vehicle_type="Taxi điện",
        base_fare_vnd=27000,
        base_km=2.0,
        per_km_vnd=13000,
        min_fare_vnd=27000,
    ),
    # ── Be ─────────────────────────────────────────────────────────────────
    VehiclePricing(
        brand="Be",
        vehicle_type="BeBike",
        base_fare_vnd=12500,
        base_km=2.0,
        per_km_vnd=4500,
        min_fare_vnd=12500,
    ),
    VehiclePricing(
        brand="Be",
        vehicle_type="BeCar",
        base_fare_vnd=29000,
        base_km=2.0,
        per_km_vnd=11000,
        min_fare_vnd=29000,
    ),
)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class VehicleFare(BaseModel):
    """Estimated fare for a specific brand vehicle."""

    brand: str = Field(description="Tên hãng xe: Grab, Xanh SM, Be")
    vehicle_type: str = Field(description="Loại xe: Bike / Car")
    distance_km: float = Field(ge=0, description="Khoảng cách tính cước (km)")
    estimated_fare_vnd: int = Field(ge=0, description="Cước ước tính (VND, làm tròn)")


# ---------------------------------------------------------------------------
# Pure Calculation Functions
# ---------------------------------------------------------------------------
def _validate_coordinate(lat: float, lon: float, point_label: str = "Tọa độ") -> None:
    """Validate latitude [-90, 90] and longitude [-180, 180]."""
    if not (-90.0 <= lat <= 90.0):
        raise InvalidCoordinateError(
            f"{point_label} có vĩ độ (latitude)={lat} không hợp lệ (phải nằm trong [-90.0, 90.0])."
        )
    if not (-180.0 <= lon <= 180.0):
        raise InvalidCoordinateError(
            f"{point_label} có kinh độ (longitude)={lon} không hợp lệ "
            "(phải nằm trong [-180.0, 180.0])."
        )


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth surface
    using the Haversine formula (Earth radius R = 6371.0 km).

    Args:
        lat1: Latitude of point 1 (degrees).
        lon1: Longitude of point 1 (degrees).
        lat2: Latitude of point 2 (degrees).
        lon2: Longitude of point 2 (degrees).

    Returns:
        Great-circle distance in kilometers (>= 0.0).

    Raises:
        InvalidCoordinateError: If any coordinate is outside physical boundaries.
    """
    _validate_coordinate(lat1, lon1, "Điểm xuất phát (point 1)")
    _validate_coordinate(lat2, lon2, "Điểm đến (point 2)")

    # Exact same point optimization
    if lat1 == lat2 and lon1 == lon2:
        return 0.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    # Clamp 'a' to [0.0, 1.0] to guard against floating point inaccuracies
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_KM * c


def estimate_road_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    *,
    factor: float = ROAD_DISTANCE_FACTOR,
) -> float:
    """Estimate urban road distance in km by scaling Haversine distance."""
    straight_km = haversine_km(lat1, lon1, lat2, lon2)
    return round(straight_km * factor, 2)


def cars_needed_for_group(member_count: int = 1) -> int:
    """Return number of standard 4-seat cars required for a group."""
    return max(1, math.ceil(max(1, int(member_count)) / 4))


def calculate_single_fare(pricing: VehiclePricing, distance_km: float) -> int:
    """
    Calculate fare for a specific pricing rule and distance.

    Args:
        pricing: Pricing parameters for the vehicle.
        distance_km: Distance in km.

    Returns:
        Estimated fare in VND (rounded to nearest integer).
    """
    if distance_km < 0:
        raise InvalidDistanceError(
            f"Khoảng cách không thể là số âm: distance_km={distance_km}"
        )

    if distance_km <= pricing.base_km:
        raw_fare = float(pricing.base_fare_vnd)
    else:
        extra_km = distance_km - pricing.base_km
        raw_fare = pricing.base_fare_vnd + extra_km * pricing.per_km_vnd

    fare = max(pricing.min_fare_vnd, round(raw_fare))
    return int(fare)


def estimate_ride_fares(distance_km: float) -> list[VehicleFare]:
    """
    Estimate ride fares in parallel across 3 brands (Grab, Xanh SM, Be)
    covering 6 vehicle types (bikes & cars).

    Args:
        distance_km: Distance in kilometers.

    Returns:
        List of VehicleFare instances for all 6 vehicle options.

    Raises:
        InvalidDistanceError: If distance_km is negative.
    """
    if distance_km < 0:
        raise InvalidDistanceError(
            f"Khoảng cách di chuyển không thể là số âm: distance_km={distance_km}"
        )

    dist_rounded = round(distance_km, 3)
    results: list[VehicleFare] = []

    for rule in FARE_RULES:
        fare = calculate_single_fare(rule, dist_rounded)
        results.append(
            VehicleFare(
                brand=rule.brand,
                vehicle_type=rule.vehicle_type,
                distance_km=dist_rounded,
                estimated_fare_vnd=fare,
            )
        )

    return results
