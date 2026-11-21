"""
test_transit_calculator.py — Unit tests for Haversine distance and ride fare estimation.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

import pytest

from app.utils.transit_calculator import (
    FARE_RULES,
    InvalidCoordinateError,
    InvalidDistanceError,
    VehicleFare,
    calculate_single_fare,
    estimate_ride_fares,
    haversine_km,
)


# ---------------------------------------------------------------------------
# Haversine Distance Tests
# ---------------------------------------------------------------------------
def test_haversine_same_point():
    """Distance between identical coordinates must be exactly 0.0 km."""
    lat, lon = 10.7769, 106.6953
    dist = haversine_km(lat, lon, lat, lon)
    assert dist == 0.0


def test_haversine_known_hcmc_landmarks():
    """
    Test real distance between Dinh Độc Lập and Nhà thờ Đức Bà.
    GPS: (10.7769, 106.6953) to (10.7798, 106.6990).
    Real-world straight-line distance is ~0.52 - 0.54 km.
    """
    dinh_doc_lap = (10.7769, 106.6953)
    nha_tho_duc_ba = (10.7798, 106.6990)
    dist = haversine_km(
        dinh_doc_lap[0], dinh_doc_lap[1], nha_tho_duc_ba[0], nha_tho_duc_ba[1]
    )
    assert 0.45 < dist < 0.60


def test_haversine_ben_thanh_to_airport():
    """
    Test distance from Bến Thành Market to Tân Sơn Nhất Airport.
    GPS: (10.7725, 106.6980) to (10.8185, 106.6588).
    Straight line distance is roughly 6.5 - 7.0 km.
    """
    dist = haversine_km(10.7725, 106.6980, 10.8185, 106.6588)
    assert 6.0 <= dist <= 7.5


def test_haversine_invalid_coordinates():
    """Coordinates outside physical limits [-90, 90] and [-180, 180] must raise InvalidCoordinateError."""
    # Latitude > 90
    with pytest.raises(InvalidCoordinateError):
        haversine_km(91.0, 106.0, 10.0, 106.0)

    # Latitude < -90
    with pytest.raises(InvalidCoordinateError):
        haversine_km(-90.5, 106.0, 10.0, 106.0)

    # Longitude > 180
    with pytest.raises(InvalidCoordinateError):
        haversine_km(10.0, 180.5, 10.0, 106.0)

    # Longitude < -180
    with pytest.raises(InvalidCoordinateError):
        haversine_km(10.0, 106.0, 10.0, -181.0)


# ---------------------------------------------------------------------------
# Single Fare Calculation Tests
# ---------------------------------------------------------------------------
def test_calculate_single_fare_base_distance():
    """Distance <= base_km should charge exactly base_fare_vnd."""
    grab_bike_rule = next(r for r in FARE_RULES if r.vehicle_type == "GrabBike")
    fare_0km = calculate_single_fare(grab_bike_rule, 0.0)
    fare_1km = calculate_single_fare(grab_bike_rule, 1.0)
    fare_2km = calculate_single_fare(grab_bike_rule, 2.0)

    assert fare_0km == grab_bike_rule.base_fare_vnd
    assert fare_1km == grab_bike_rule.base_fare_vnd
    assert fare_2km == grab_bike_rule.base_fare_vnd


def test_calculate_single_fare_extra_distance():
    """Distance > base_km should charge base_fare + (distance - base_km) * per_km."""
    grab_bike_rule = next(r for r in FARE_RULES if r.vehicle_type == "GrabBike")
    # Base: 13,800 for 2km, 4,800/km extra. For 5km: 13,800 + 3 * 4,800 = 28,200 VND
    expected = 13800 + 3 * 4800
    fare_5km = calculate_single_fare(grab_bike_rule, 5.0)
    assert fare_5km == expected


def test_calculate_single_fare_negative_distance():
    """Negative distance must raise InvalidDistanceError."""
    grab_bike_rule = FARE_RULES[0]
    with pytest.raises(InvalidDistanceError):
        calculate_single_fare(grab_bike_rule, -1.0)


# ---------------------------------------------------------------------------
# 3-Brand Fare Estimation Tests
# ---------------------------------------------------------------------------
def test_estimate_ride_fares_all_six_vehicles():
    """estimate_ride_fares must return 6 options across Grab, Xanh SM, and Be."""
    results = estimate_ride_fares(4.5)
    assert len(results) == 6

    brands = {item.brand for item in results}
    assert brands == {"Grab", "Xanh SM", "Be"}

    vehicles = {item.vehicle_type for item in results}
    assert vehicles == {
        "GrabBike",
        "GrabCar",
        "Bike điện",
        "Taxi điện",
        "BeBike",
        "BeCar",
    }


def test_estimate_ride_fares_properties():
    """Each VehicleFare must have valid types and values."""
    results = estimate_ride_fares(3.0)
    for fare in results:
        assert isinstance(fare, VehicleFare)
        assert fare.distance_km == 3.0
        assert fare.estimated_fare_vnd > 0
        assert isinstance(fare.estimated_fare_vnd, int)


def test_estimate_ride_fares_monotonic_increase():
    """Car fares for 10 km must be strictly greater than for 2 km."""
    fares_short = {
        f.vehicle_type: f.estimated_fare_vnd for f in estimate_ride_fares(2.0)
    }
    fares_long = {
        f.vehicle_type: f.estimated_fare_vnd for f in estimate_ride_fares(10.0)
    }

    for vtype, short_val in fares_short.items():
        assert fares_long[vtype] > short_val


def test_estimate_ride_fares_negative_distance():
    """Negative distance must raise InvalidDistanceError."""
    with pytest.raises(InvalidDistanceError):
        estimate_ride_fares(-0.5)
