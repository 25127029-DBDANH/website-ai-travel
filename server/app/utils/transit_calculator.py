"""
transit_calculator.py — Pure functions for GPS Haversine distance and ride fare estimation.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
EARTH_RADIUS_KM: float = 6371.0
# ASSUMPTION: Hệ số đường nội đô TP.HCM ~1.3 so với đường chim bay (theo docs kiến trúc).
HCMC_ROAD_FACTOR: float = 1.3
WALK_THRESHOLD_KM: float = 0.8
WALK_SPEED_KMH: float = 5.0
RIDE_SPEED_KMH: float = 20.0
BIKE_SPEED_KMH: float = 22.0
CAR_SPEED_KMH: float = 18.0


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
        base_fare_vnd=29000,
        base_km=2.0,
        per_km_vnd=11000,
        min_fare_vnd=29000,
    ),
    # ── Xanh SM ────────────────────────────────────────────────────────────
    VehiclePricing(
        brand="Xanh SM",
        vehicle_type="Bike điện",
        base_fare_vnd=14000,
        base_km=2.0,
        per_km_vnd=4800,
        min_fare_vnd=14000,
    ),
    VehiclePricing(
        brand="Xanh SM",
        vehicle_type="Taxi điện",
        base_fare_vnd=25000,
        base_km=2.0,
        per_km_vnd=12500,
        min_fare_vnd=25000,
    ),
    # ── Be ─────────────────────────────────────────────────────────────────
    VehiclePricing(
        brand="Be",
        vehicle_type="BeBike",
        base_fare_vnd=13000,
        base_km=2.0,
        per_km_vnd=4500,
        min_fare_vnd=13000,
    ),
    VehiclePricing(
        brand="Be",
        vehicle_type="BeCar",
        base_fare_vnd=27000,
        base_km=2.0,
        per_km_vnd=10500,
        min_fare_vnd=27000,
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
    duration_min: int = Field(default=0, ge=0, description="Thời gian di chuyển ước tính (phút)")
    deep_link: str = Field(default="", description="Deep link mở ứng dụng gọi xe")


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
        raise InvalidDistanceError(f"Khoảng cách không thể là số âm: distance_km={distance_km}")

    if distance_km <= pricing.base_km:
        raw_fare = float(pricing.base_fare_vnd)
    else:
        extra_km = distance_km - pricing.base_km
        raw_fare = pricing.base_fare_vnd + extra_km * pricing.per_km_vnd

    fare = max(pricing.min_fare_vnd, round(raw_fare))
    return int(fare)


def build_ride_deep_link(
    brand: str,
    dropoff_lat: float | None = None,
    dropoff_lng: float | None = None,
    dropoff_name: str | None = None,
    dropoff_address: str | None = None,
) -> str:
    """Build a ride-hailing deep link URL for Grab, Xanh SM, or Be."""
    normalized = brand.strip().lower()
    has_coords = dropoff_lat is not None and dropoff_lng is not None
    enc_name = quote(dropoff_name or "Điểm đến TP.HCM", safe="")
    enc_addr = quote(dropoff_address or "TP. Hồ Chí Minh", safe="")

    if normalized == "grab":
        if has_coords:
            return (
                "grab://open?screenType=BOOKING"
                f"&dropoffLatitude={dropoff_lat}&dropoffLongitude={dropoff_lng}"
                f"&dropoffName={enc_name}&dropoffAddress={enc_addr}"
            )
        return "grab://open?screenType=BOOKING"

    if normalized in {"xanh sm", "xanhsm"}:
        if has_coords:
            return f"xanhsm://booking?lat={dropoff_lat}&lng={dropoff_lng}&destination={enc_name}"
        return "xanhsm://booking"

    if normalized == "be":
        if has_coords:
            return (
                f"be://booking?destination_lat={dropoff_lat}"
                f"&destination_lng={dropoff_lng}&destination_name={enc_name}"
            )
        return "be://booking"

    return ""


def _estimate_duration_min(distance_km: float, speed_kmh: float) -> int:
    if distance_km <= 0:
        return 0
    return max(5, round((distance_km / speed_kmh) * 60.0))


def estimate_ride_fares(
    distance_km: float,
    *,
    dropoff_lat: float | None = None,
    dropoff_lng: float | None = None,
    dropoff_name: str | None = None,
    dropoff_address: str | None = None,
) -> list[VehicleFare]:
    """
    Estimate ride fares in parallel across 3 brands (Grab, Xanh SM, Be)
    covering 6 vehicle types (bikes & cars).

    Args:
        distance_km: Distance in kilometers.
        dropoff_lat: Optional destination latitude for deep-link generation.
        dropoff_lng: Optional destination longitude for deep-link generation.
        dropoff_name: Optional destination name for deep-link generation.
        dropoff_address: Optional destination address for deep-link generation.

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
        speed = BIKE_SPEED_KMH if "bike" in rule.vehicle_type.lower() else CAR_SPEED_KMH
        duration = _estimate_duration_min(dist_rounded, speed)
        deep_link = build_ride_deep_link(
            rule.brand,
            dropoff_lat=dropoff_lat,
            dropoff_lng=dropoff_lng,
            dropoff_name=dropoff_name,
            dropoff_address=dropoff_address,
        )
        results.append(
            VehicleFare(
                brand=rule.brand,
                vehicle_type=rule.vehicle_type,
                distance_km=dist_rounded,
                estimated_fare_vnd=fare,
                duration_min=duration,
                deep_link=deep_link,
            )
        )

    return results


def calculate_transit(
    from_lat: float | None,
    from_lng: float | None,
    to_lat: float | None,
    to_lng: float | None,
    *,
    dropoff_name: str | None = None,
    dropoff_address: str | None = None,
) -> dict[str, Any] | None:
    """
    Calculate transit summary (mode, road distance, duration, fare, deep link)
    between two GPS coordinates using Haversine * HCMC road factor (1.3).

    Returns None if any coordinate is missing (None).
    """
    if from_lat is None or from_lng is None or to_lat is None or to_lng is None:
        return None

    straight_km = haversine_km(float(from_lat), float(from_lng), float(to_lat), float(to_lng))
    road_distance_km = round(straight_km * HCMC_ROAD_FACTOR, 2)
    deep_link = build_ride_deep_link(
        "Grab",
        dropoff_lat=float(to_lat),
        dropoff_lng=float(to_lng),
        dropoff_name=dropoff_name,
        dropoff_address=dropoff_address,
    )

    if road_distance_km <= WALK_THRESHOLD_KM:
        walk_minutes = max(2, round((road_distance_km / WALK_SPEED_KMH) * 60.0))
        return {
            "mode": "walk",
            "distance_km": road_distance_km,
            "duration_min": walk_minutes,
            "estimated_fare_vnd": 0,
            "label": f"🚶 {walk_minutes} min walk ({int(road_distance_km * 1000)}m)",
            "deep_link": deep_link,
        }

    ride_minutes = max(5, round((road_distance_km / RIDE_SPEED_KMH) * 60.0))
    # ASSUMPTION: Giá cước tham chiếu làm tròn lên bội 5.000 VND (docs/02-architecture-db-ai.md).
    raw_fare = 18000 + max(0.0, road_distance_km - 2.0) * 5500
    rounded_fare = int(math.ceil(raw_fare / 5000.0) * 5000)
    return {
        "mode": "ride",
        "distance_km": road_distance_km,
        "duration_min": ride_minutes,
        "estimated_fare_vnd": rounded_fare,
        "label": f"🚕 {ride_minutes} min ride (~₫{rounded_fare:,})",
        "deep_link": deep_link,
    }
