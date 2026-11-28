"""Trip ownership, validation, clone, and share API tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.tests.conftest import create_trip


@pytest.mark.integration
async def test_create_trip_persists_a_valid_trip(
    authenticated_client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    created = await create_trip(authenticated_client, trip_payload)

    assert created.get("id")
    assert created["title"] == trip_payload["title"]
    assert created["budget"] == trip_payload["budget"]
    assert created["days"] == trip_payload["days"]


@pytest.mark.integration
@pytest.mark.parametrize("days", [0, 15])
async def test_create_trip_rejects_days_outside_documented_range(
    authenticated_client: AsyncClient, trip_payload: dict[str, object], days: int
) -> None:
    response = await authenticated_client.post(
        "/api/v1/trips/", json={**trip_payload, "days": days}
    )

    assert response.status_code == 422, response.text


@pytest.mark.integration
async def test_trip_is_hidden_from_another_session(
    authenticated_client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    created = await create_trip(authenticated_client, trip_payload)
    other = await authenticated_client.post(
        "/api/v1/auth/register",
        json={"username": "another_user", "password": "SaigonTrip!2026"},
    )
    assert other.status_code == 201, other.text

    response = await authenticated_client.get(
        f"/api/v1/trips/{created['id']}",
        headers={"Authorization": f"Bearer {other.json()['token']}"},
    )

    assert response.status_code == 404


@pytest.mark.integration
async def test_list_trips_is_limited_to_the_current_session(
    authenticated_client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    own = await create_trip(authenticated_client, trip_payload)
    other = await authenticated_client.post(
        "/api/v1/auth/register",
        json={"username": "second_user", "password": "SaigonTrip!2026"},
    )
    assert other.status_code == 201, other.text
    await create_trip(
        authenticated_client,
        {**trip_payload, "start_location": "Quận 3"},
        auth_token=other.json()["token"],
    )

    response = await authenticated_client.get("/api/v1/trips/me")

    assert response.status_code == 200, response.text
    rows = response.json().get("trips", [])
    assert [row["id"] for row in rows] == [own["id"]]


@pytest.mark.integration
async def test_update_and_delete_trip(
    authenticated_client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    created = await create_trip(authenticated_client, trip_payload)
    updated = await authenticated_client.put(
        f"/api/v1/trips/{created['id']}", json={"title": "Saigon weekend"}
    )

    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "Saigon weekend"

    deleted = await authenticated_client.delete(f"/api/v1/trips/{created['id']}")
    missing = await authenticated_client.get(f"/api/v1/trips/{created['id']}")
    assert deleted.status_code == 200
    assert missing.status_code == 404


@pytest.mark.integration
async def test_duplicate_trip_has_a_new_id(
    authenticated_client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    original = await create_trip(authenticated_client, trip_payload)
    response = await authenticated_client.post(f"/api/v1/trips/{original['id']}/clone")

    assert response.status_code == 200, response.text
    duplicate = response.json()
    assert duplicate.get("id")
    assert duplicate["id"] != original["id"]


@pytest.mark.integration
async def test_shared_trip_is_read_only_and_omits_private_fields(
    authenticated_client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    created = await create_trip(authenticated_client, trip_payload)
    created_link = await authenticated_client.post(f"/api/v1/trips/{created['id']}/share")
    assert created_link.status_code == 200, created_link.text
    token = created_link.json()["token"]

    public_view = await authenticated_client.get(f"/api/v1/trips/shared/{token}")
    assert public_view.status_code == 200, public_view.text
    payload = public_view.json()
    assert "session_id" not in payload.get("trip", {})
    assert "user_id" not in payload.get("trip", {})

    revoked = await authenticated_client.delete(f"/api/v1/trips/{created['id']}/share")
    old_link = await authenticated_client.get(f"/api/v1/trips/shared/{token}")
    assert revoked.status_code == 200, revoked.text
    assert old_link.status_code == 404


@pytest.mark.integration
async def test_checked_in_item_is_locked_against_patch_and_put(
    authenticated_client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    items = [
        {
            "day_number": 1,
            "order_index": 1,
            "place_id": "p-1",
            "place_name": "Shin Coffee",
            "category": "cafe",
            "estimated_cost": 45000,
            "visited": False,
            "is_accepted": False,
            "transit_info": {"mode": "grab_car", "distance_km": 0.5, "estimated_fare_vnd": 32000},
        },
        {
            "day_number": 1,
            "order_index": 2,
            "place_id": "p-2",
            "place_name": "Phở Quỳnh",
            "category": "food",
            "estimated_cost": 85000,
            "visited": False,
            "is_accepted": False,
            "transit_info": {"mode": "grab_car", "distance_km": 1.1, "estimated_fare_vnd": 32000},
        },
    ]
    created = await create_trip(authenticated_client, {**trip_payload, "itinerary_items": items})

    checked = await authenticated_client.patch(
        f"/api/v1/trips/{created['id']}/items/1/1", json={"visited": True}
    )
    assert checked.status_code == 200, checked.text

    # Further PATCH on visited item must fail with 409 ITEM_VISITED_LOCKED
    uncheck = await authenticated_client.patch(
        f"/api/v1/trips/{created['id']}/items/1/1", json={"visited": False}
    )
    assert uncheck.status_code == 409
    assert uncheck.json()["detail"] == "ITEM_VISITED_LOCKED"

    accept_locked = await authenticated_client.patch(
        f"/api/v1/trips/{created['id']}/items/1/1", json={"is_accepted": True}
    )
    assert accept_locked.status_code == 409
    assert accept_locked.json()["detail"] == "ITEM_VISITED_LOCKED"

    # PUT attempting to swap/uncheck/mutate transit_info of visited item must also 409
    locked_items = checked.json()["items"]
    mutated_put = await authenticated_client.put(
        f"/api/v1/trips/{created['id']}",
        json={
            "itinerary_items": [
                {**locked_items[0], "place_name": "Hacked Stop"},
                locked_items[1],
            ]
        },
    )
    assert mutated_put.status_code == 409
    assert mutated_put.json()["detail"] == "ITEM_VISITED_LOCKED"

    # PUT keeping visited item 1 untouched while swapping unvisited item 2 must succeed
    valid_put = await authenticated_client.put(
        f"/api/v1/trips/{created['id']}",
        json={
            "itinerary_items": [
                locked_items[0],
                {**locked_items[1], "place_name": "Cơm Tấm Ba Ghiền", "estimated_cost": 55000},
            ]
        },
    )
    assert valid_put.status_code == 200, valid_put.text
