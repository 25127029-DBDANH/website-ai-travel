"""
test_transit_endpoints.py — Integration tests for /api/v1/transit endpoints.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import Place


@pytest.mark.integration
async def test_estimate_transit_walkable_route(client: AsyncClient) -> None:
    """Short route (<= 0.8 km road distance) returns walk mode with 3 ride providers."""
    response = await client.post(
        "/api/v1/transit/estimate",
        json={
            "origin_lat": 10.7769,
            "origin_lng": 106.6953,
            "dest_lat": 10.7798,
            "dest_lng": 106.6990,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "walk"
    assert 0 < data["distance_km"] <= 0.8
    assert data["estimated_fare_vnd"] == 0
    assert data["duration_min"] >= 2
    assert f"{data['duration_min']} min" in data["label"]
    assert len(data["fares"]) == 6
    assert len(data["providers"]) == 3
    for provider in data["providers"]:
        assert "deep_link" not in provider
        assert provider["duration_min"] > 0


@pytest.mark.integration
async def test_estimate_transit_ride_with_rush_hour_and_rain(client: AsyncClient) -> None:
    """Cross-city route in rush hour & rain syncs duration_min and label (+20 min)."""
    base_resp = await client.post(
        "/api/v1/transit/estimate",
        json={
            "origin_lat": 10.7725,
            "origin_lng": 106.6980,
            "dest_lat": 10.7495,
            "dest_lng": 106.6510,
            "current_time": "14:00",
            "is_raining": False,
        },
    )
    assert base_resp.status_code == 200
    base = base_resp.json()
    assert base["mode"] == "ride"
    assert base["distance_km"] > 6.0
    assert base["is_rush_hour"] is False
    assert base["is_rain_mode"] is False
    assert f"{base['duration_min']} min ride" in base["label"]

    rush_rain_resp = await client.post(
        "/api/v1/transit/estimate",
        json={
            "origin_lat": 10.7725,
            "origin_lng": 106.6980,
            "dest_lat": 10.7495,
            "dest_lng": 106.6510,
            "current_time": "17:30",
            "is_raining": True,
        },
    )
    assert rush_rain_resp.status_code == 200
    rush_rain = rush_rain_resp.json()
    assert rush_rain["is_rush_hour"] is True
    assert rush_rain["is_rain_mode"] is True
    assert rush_rain["duration_min"] == base["duration_min"] + 20
    assert f"{rush_rain['duration_min']} min ride" in rush_rain["label"]
    assert "GrabCar" in rush_rain["recommended_vehicles"]


@pytest.mark.integration
async def test_estimate_transit_rejects_outside_hcmc_and_invalid_coords(
    client: AsyncClient,
) -> None:
    """Coordinates outside HCMC bounding box or physical limits return HTTP 422."""
    # Hanoi coordinates — valid GPS, but outside HCMC bounding box
    outside_resp = await client.post(
        "/api/v1/transit/estimate",
        json={
            "origin_lat": 21.0285,
            "origin_lng": 105.8542,
            "dest_lat": 10.7798,
            "dest_lng": 106.6990,
        },
    )
    assert outside_resp.status_code == 422

    # Physically invalid latitude
    invalid_resp = await client.post(
        "/api/v1/transit/estimate",
        json={
            "origin_lat": 120.0,
            "origin_lng": 106.6953,
            "dest_lat": 10.7798,
            "dest_lng": 106.6990,
        },
    )
    assert invalid_resp.status_code == 422


@pytest.mark.integration
async def test_adapt_itinerary_validation_rejects_bad_types_and_too_many_items(
    client: AsyncClient,
) -> None:
    """Malformed transit fields and oversized item lists fail cleanly with HTTP 422."""
    bad_type_resp = await client.post(
        "/api/v1/transit/adapt",
        json={
            "is_traffic": True,
            "items": [
                {
                    "day_number": 1,
                    "place_name": "Dinh Độc Lập",
                    "transit_info": {"duration_min": "abc"},
                }
            ],
        },
    )
    assert bad_type_resp.status_code == 422

    too_many_resp = await client.post(
        "/api/v1/transit/adapt",
        json={
            "items": [{"day_number": 1, "place_name": f"Stop {i}"} for i in range(61)],
        },
    )
    assert too_many_resp.status_code == 422


@pytest.mark.integration
async def test_adapt_itinerary_rain_prefers_same_district_and_category_and_restores_exact_fare(
    client: AsyncClient,
    test_database: tuple[Any, async_sessionmaker[AsyncSession]],
) -> None:
    """
    Rain mode:
    - Prefers same-district + same-category indoor Place.
    - Does NOT jump to another district when target district has no indoor place.
    - Recalculates transit_info for replaced leg and restores exact original fare on off.
    """
    _, session_factory = test_database
    async with session_factory() as session:
        session.add_all(
            [
                Place(
                    id="q1-food-indoor",
                    name="Tiệm Bánh Mì Q1",
                    address="12 Lê Lợi, Quận 1",
                    district="Quận 1",
                    latitude=10.7730,
                    longitude=106.7000,
                    category="food",
                    is_indoor=True,
                    entry_fee_vnd=45000,
                    average_rating=4.9,
                    is_active=True,
                ),
                Place(
                    id="q1-culture-indoor",
                    name="Bảo tàng Mỹ thuật TP.HCM",
                    address="97A Phó Đức Chính, Quận 1",
                    district="Quận 1",
                    latitude=10.7698,
                    longitude=106.6995,
                    category="culture",
                    is_indoor=True,
                    entry_fee_vnd=30000,
                    average_rating=4.7,
                    is_active=True,
                ),
                Place(
                    id="q3-culture-indoor",
                    name="Bảo tàng Chứng tích Chiến tranh",
                    address="28 Võ Văn Tần, Quận 3",
                    district="Quận 3",
                    latitude=10.7795,
                    longitude=106.6921,
                    category="culture",
                    is_indoor=True,
                    entry_fee_vnd=40000,
                    average_rating=4.8,
                    is_active=True,
                ),
            ]
        )
        await session.commit()

    payload = {
        "day_number": 1,
        "is_raining": True,
        "is_traffic": False,
        "replace_outdoor": True,
        "items": [
            {
                "day_number": 1,
                "order_index": 1,
                "place_id": "start-dinh",
                "place_name": "Dinh Độc Lập",
                "district": "Quận 1",
                "latitude": 10.7769,
                "longitude": 106.6953,
                "category": "culture",
                "is_indoor": True,
                "visited": False,
            },
            {
                "day_number": 1,
                "order_index": 2,
                "place_id": "outdoor-street-q1",
                "place_name": "Phố đi bộ Nguyễn Huệ",
                "district": "Quận 1",
                "latitude": 10.7743,
                "longitude": 106.7037,
                "category": "culture",
                "is_indoor": False,
                "visited": False,
                "transit_info": {
                    "mode": "grab_bike",
                    "distance_km": 1.2,
                    "duration_min": 8,
                    "estimated_fare_vnd": 20000,
                    "label": "🚕 8 min ride (~₫20,000)",
                    "is_rain_mode": False,
                    "is_rush_hour": False,
                },
            },
            {
                "day_number": 1,
                "order_index": 3,
                "place_id": "outdoor-cangio",
                "place_name": "Rừng Sác Cần Giờ",
                "district": "Cần Giờ",
                "latitude": 10.4833,
                "longitude": 106.8667,
                "category": "nature",
                "is_indoor": False,
                "visited": False,
                "transit_info": {
                    "mode": "grab_bike",
                    "distance_km": 42.0,
                    "duration_min": 90,
                    "estimated_fare_vnd": 20000,
                    "label": "🚕 90 min ride (~₫20,000)",
                    "is_rain_mode": False,
                    "is_rush_hour": False,
                },
            },
        ],
    }

    resp1 = await client.post("/api/v1/transit/adapt", json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["is_raining"] is True

    # Only Q1 stop replaced, and it chose culture (Bảo tàng Mỹ thuật) over higher-rated food
    assert len(data1["replaced_stops"]) == 1
    assert data1["replaced_stops"][0]["replacement_place_name"] == "Bảo tàng Mỹ thuật TP.HCM"

    swapped_stop = data1["items"][1]
    assert swapped_stop["place_name"] == "Bảo tàng Mỹ thuật TP.HCM"
    assert swapped_stop["transit_info"]["mode"] == "grab_car"
    assert swapped_stop["transit_info"]["is_rain_mode"] is True
    assert swapped_stop["transit_info"]["estimated_fare_vnd"] == 35000

    # Cần Giờ stop kept in Cần Giờ (did NOT jump to Quận 3), leg recalculated & switched to car
    cangio_stop = data1["items"][2]
    assert cangio_stop["place_name"] == "Rừng Sác Cần Giờ"
    assert cangio_stop["district"] == "Cần Giờ"
    assert cangio_stop["transit_info"]["is_rain_mode"] is True
    cangio_original_fare = cangio_stop["transit_info"]["original_fare_vnd"]
    expected_cangio_rain_fare = max(35000, round(cangio_original_fare * 1.5))
    assert cangio_original_fare > 20000
    assert cangio_stop["transit_info"]["estimated_fare_vnd"] == expected_cangio_rain_fare

    # Calling again is idempotent
    resp2 = await client.post("/api/v1/transit/adapt", json={**payload, "items": data1["items"]})
    assert resp2.status_code == 200
    assert (
        resp2.json()["items"][2]["transit_info"]["estimated_fare_vnd"] == expected_cangio_rain_fare
    )

    # Disabling rain restores exact original fare (no / 1.5 rounding drift)
    off_resp = await client.post(
        "/api/v1/transit/adapt",
        json={
            "day_number": 1,
            "is_raining": False,
            "is_traffic": False,
            "items": resp2.json()["items"],
        },
    )
    assert off_resp.status_code == 200
    restored = off_resp.json()["items"][2]["transit_info"]
    assert restored["is_rain_mode"] is False
    assert restored["mode"] == "ride"
    assert restored["estimated_fare_vnd"] == cangio_original_fare


@pytest.mark.integration
async def test_adapt_itinerary_traffic_applies_even_with_offpeak_current_time(
    client: AsyncClient,
) -> None:
    """`is_traffic: true` adds +20 min and syncs label even if `current_time` is '14:00'."""
    base_items = [
        {
            "day_number": 1,
            "order_index": 1,
            "place_name": "Dinh Độc Lập",
            "district": "Quận 1",
            "is_indoor": True,
            "transit_info": {
                "mode": "grab_bike",
                "distance_km": 2.5,
                "duration_min": 15,
                "estimated_fare_vnd": 25000,
                "label": "🚕 15 min ride (~₫25,000)",
                "is_rain_mode": False,
                "is_rush_hour": False,
            },
        }
    ]

    on_resp = await client.post(
        "/api/v1/transit/adapt",
        json={
            "day_number": 1,
            "is_traffic": True,
            "current_time": "14:00",
            "items": base_items,
        },
    )
    assert on_resp.status_code == 200
    on_data = on_resp.json()
    assert on_data["is_rush_hour"] is True
    assert on_data["items"][0]["transit_info"]["duration_min"] == 35
    assert on_data["items"][0]["transit_info"]["is_rush_hour"] is True
    assert "35 min ride" in on_data["items"][0]["transit_info"]["label"]

    # Idempotent second call
    on_again = await client.post(
        "/api/v1/transit/adapt",
        json={
            "day_number": 1,
            "is_traffic": True,
            "current_time": "14:00",
            "items": on_data["items"],
        },
    )
    assert on_again.status_code == 200
    assert on_again.json()["items"][0]["transit_info"]["duration_min"] == 35

    # Turn off traffic mode
    off_resp = await client.post(
        "/api/v1/transit/adapt",
        json={"day_number": 1, "is_traffic": False, "items": on_again.json()["items"]},
    )
    assert off_resp.status_code == 200
    assert off_resp.json()["is_rush_hour"] is False
    assert off_resp.json()["items"][0]["transit_info"]["duration_min"] == 15
    assert "15 min ride" in off_resp.json()["items"][0]["transit_info"]["label"]
    assert off_resp.json()["items"][0]["transit_info"]["is_rush_hour"] is False
