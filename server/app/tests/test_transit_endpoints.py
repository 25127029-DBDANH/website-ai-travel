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
            "dest_name": "Nhà thờ Đức Bà",
            "dest_address": "01 Công xã Paris, Quận 1",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "walk"
    assert 0 < data["distance_km"] <= 0.8
    assert data["estimated_fare_vnd"] == 0
    assert data["duration_min"] >= 2
    assert len(data["fares"]) == 6
    assert len(data["providers"]) == 3
    for provider in data["providers"]:
        assert provider["deep_link"]
        assert provider["duration_min"] > 0


@pytest.mark.integration
async def test_estimate_transit_ride_with_rush_hour_and_rain(client: AsyncClient) -> None:
    """Cross-city route in rush hour & rain includes +20m buffer and covered car list."""
    base_resp = await client.post(
        "/api/v1/transit/estimate",
        json={
            "origin_lat": 10.7725,
            "origin_lng": 106.6980,
            "dest_lat": 10.7495,
            "dest_lng": 106.6510,
            "dest_name": "Chợ Bình Tây",
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

    rush_rain_resp = await client.post(
        "/api/v1/transit/estimate",
        json={
            "origin_lat": 10.7725,
            "origin_lng": 106.6980,
            "dest_lat": 10.7495,
            "dest_lng": 106.6510,
            "dest_name": "Chợ Bình Tây",
            "current_time": "17:30",
            "is_raining": True,
        },
    )
    assert rush_rain_resp.status_code == 200
    rush_rain = rush_rain_resp.json()
    assert rush_rain["is_rush_hour"] is True
    assert rush_rain["is_rain_mode"] is True
    assert rush_rain["duration_min"] == base["duration_min"] + 20
    assert "GrabCar" in rush_rain["recommended_vehicles"]


@pytest.mark.integration
async def test_estimate_transit_rejects_invalid_coordinates(client: AsyncClient) -> None:
    """Out-of-range coordinates fail Pydantic validation with HTTP 422."""
    response = await client.post(
        "/api/v1/transit/estimate",
        json={
            "origin_lat": 120.0,
            "origin_lng": 106.6953,
            "dest_lat": 10.7798,
            "dest_lng": 106.6990,
        },
    )
    assert response.status_code == 422


@pytest.mark.integration
async def test_adapt_itinerary_rain_swaps_outdoor_with_db_indoor_place(
    client: AsyncClient,
    test_database: tuple[Any, async_sessionmaker[AsyncSession]],
) -> None:
    """Rain scenario replaces outdoor place with same-district indoor Place from DB."""
    _, session_factory = test_database
    async with session_factory() as session:
        session.add(
            Place(
                id="indoor-museum-q1",
                name="Bảo tàng Mỹ thuật TP.HCM",
                address="97A Phó Đức Chính, Quận 1",
                district="Quận 1",
                latitude=10.7698,
                longitude=106.6995,
                category="culture",
                is_indoor=True,
                entry_fee_vnd=30000,
                average_rating=4.8,
                is_active=True,
            )
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
                "place_id": "outdoor-street-q1",
                "place_name": "Phố đi bộ Nguyễn Huệ",
                "district": "Quận 1",
                "is_indoor": False,
                "visited": False,
                "transit_info": {
                    "mode": "grab_bike",
                    "duration_min": 12,
                    "estimated_fare_vnd": 20000,
                    "is_rain_mode": False,
                    "is_rush_hour": False,
                },
            }
        ],
    }

    resp1 = await client.post("/api/v1/transit/adapt", json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["is_raining"] is True
    assert len(data1["replaced_stops"]) == 1
    assert data1["replaced_stops"][0]["replacement_place_name"] == "Bảo tàng Mỹ thuật TP.HCM"

    updated_item = data1["items"][0]
    assert updated_item["is_indoor"] is True
    assert updated_item["place_name"] == "Bảo tàng Mỹ thuật TP.HCM"
    assert updated_item["transit_info"]["mode"] == "grab_car"
    assert updated_item["transit_info"]["is_rain_mode"] is True
    assert updated_item["transit_info"]["estimated_fare_vnd"] == 35000

    # Calling again must be idempotent on transit fare
    resp2 = await client.post(
        "/api/v1/transit/adapt",
        json={**payload, "items": data1["items"]},
    )
    assert resp2.status_code == 200
    assert resp2.json()["items"][0]["transit_info"]["estimated_fare_vnd"] == 35000


@pytest.mark.integration
async def test_adapt_itinerary_traffic_toggle_on_and_off(client: AsyncClient) -> None:
    """Rush-hour toggle adds +20 min once (idempotent) and reverts -20 min when disabled."""
    base_items = [
        {
            "day_number": 1,
            "order_index": 1,
            "place_name": "Dinh Độc Lập",
            "district": "Quận 1",
            "is_indoor": True,
            "transit_info": {
                "mode": "grab_bike",
                "duration_min": 15,
                "estimated_fare_vnd": 25000,
                "is_rain_mode": False,
                "is_rush_hour": False,
            },
        }
    ]

    on_resp = await client.post(
        "/api/v1/transit/adapt",
        json={"day_number": 1, "is_traffic": True, "items": base_items},
    )
    assert on_resp.status_code == 200
    on_data = on_resp.json()
    assert on_data["is_rush_hour"] is True
    assert on_data["items"][0]["transit_info"]["duration_min"] == 35
    assert on_data["items"][0]["transit_info"]["is_rush_hour"] is True

    # Idempotent second call
    on_again = await client.post(
        "/api/v1/transit/adapt",
        json={"day_number": 1, "is_traffic": True, "items": on_data["items"]},
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
    assert off_resp.json()["items"][0]["transit_info"]["is_rush_hour"] is False
