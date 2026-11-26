"""Regression tests for guest-owned trips and claiming them during authentication."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.core.config import settings


async def _create_guest_trip(
    client: AsyncClient, payload: dict[str, Any], headers: dict[str, str]
) -> dict[str, Any]:
    response = await client.post("/api/v1/trips/", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.integration
async def test_guest_can_create_trip_but_anonymous_request_cannot(
    client: AsyncClient, trip_payload: dict[str, Any]
) -> None:
    no_owner = await client.post("/api/v1/trips/", json=trip_payload)
    guest = await client.post(
        "/api/v1/trips/",
        json=trip_payload,
        headers={"x-session-id": str(uuid4())},
    )

    assert no_owner.status_code == 401
    assert guest.status_code == 201, guest.text


@pytest.mark.integration
async def test_guest_trip_access_is_limited_to_its_session(
    client: AsyncClient, trip_payload: dict[str, Any]
) -> None:
    guest_a = {"x-session-id": str(uuid4())}
    guest_b = {"x-session-id": str(uuid4())}
    created = await client.post("/api/v1/trips/", json=trip_payload, headers=guest_a)
    assert created.status_code == 201, created.text

    own_trips = await client.get("/api/v1/trips/me", headers=guest_a)
    another_guest = await client.get(f"/api/v1/trips/{created.json()['id']}", headers=guest_b)

    assert [trip["id"] for trip in own_trips.json()["trips"]] == [created.json()["id"]]
    assert another_guest.status_code == 404


@pytest.mark.integration
async def test_register_claims_guest_trips_and_returns_them_to_account(
    client: AsyncClient, trip_payload: dict[str, Any]
) -> None:
    session_id = str(uuid4())
    guest_headers = {"x-session-id": session_id}
    await _create_guest_trip(client, trip_payload, guest_headers)
    await _create_guest_trip(client, {**trip_payload, "title": "Second guest trip"}, guest_headers)

    registered = await client.post(
        "/api/v1/auth/register",
        json={"username": f"qa_{uuid4().hex[:12]}", "password": "SaigonTrip!2026"},
        headers=guest_headers,
    )
    assert registered.status_code == 201, registered.text
    assert registered.json()["claimed_trips"] == 2

    account_trips = await client.get(
        "/api/v1/trips/me",
        headers={"Authorization": f"Bearer {registered.json()['token']}"},
    )
    assert len(account_trips.json()["trips"]) == 2


@pytest.mark.integration
async def test_login_claims_guest_trips_and_returns_them_to_account(
    client: AsyncClient, trip_payload: dict[str, Any]
) -> None:
    username = f"qa_{uuid4().hex[:12]}"
    registered = await client.post(
        "/api/v1/auth/register",
        json={"username": username, "password": "SaigonTrip!2026"},
    )
    assert registered.status_code == 201, registered.text

    session_id = str(uuid4())
    guest_headers = {"x-session-id": session_id}
    await _create_guest_trip(client, trip_payload, guest_headers)
    await _create_guest_trip(client, {**trip_payload, "title": "Second login trip"}, guest_headers)
    logged_in = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "SaigonTrip!2026"},
        headers=guest_headers,
    )
    assert logged_in.status_code == 200, logged_in.text
    assert logged_in.json()["claimed_trips"] == 2

    account_trips = await client.get(
        "/api/v1/trips/me",
        headers={"Authorization": f"Bearer {logged_in.json()['token']}"},
    )
    assert len(account_trips.json()["trips"]) == 2


@pytest.mark.integration
async def test_guest_session_is_limited_to_ten_trips(
    client: AsyncClient, trip_payload: dict[str, Any]
) -> None:
    headers = {"x-session-id": str(uuid4())}
    for number in range(10):
        response = await client.post(
            "/api/v1/trips/",
            json={**trip_payload, "title": f"Guest trip {number}"},
            headers=headers,
        )
        assert response.status_code == 201, response.text

    blocked = await client.post(
        "/api/v1/trips/", json={**trip_payload, "title": "Guest trip 11"}, headers=headers
    )
    assert blocked.status_code == 429
    assert blocked.json()["detail"] == "TRIP_SESSION_LIMIT_REACHED"


@pytest.mark.integration
async def test_change_password_requires_current_password(
    client: AsyncClient,
) -> None:
    registered = await client.post(
        "/api/v1/auth/register",
        json={"username": f"qa_{uuid4().hex[:12]}", "password": "SaigonTrip!2026"},
    )
    headers = {"Authorization": f"Bearer {registered.json()['token']}"}

    wrong = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "incorrect", "new_password": "NewSaigon!2026"},
        headers=headers,
    )
    changed = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "SaigonTrip!2026", "new_password": "NewSaigon!2026"},
        headers=headers,
    )

    assert wrong.status_code == 403
    assert wrong.json()["detail"] == "AUTH_PASSWORD_INVALID"
    assert changed.status_code == 200, changed.text


@pytest.mark.integration
async def test_google_login_claims_guest_trips(
    client: AsyncClient,
    trip_payload: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.api.v1.endpoints import auth

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")

    async def verify_google_token(*args: Any, **kwargs: Any) -> dict[str, Any]:
        return {
            "sub": "google-guest-claim-test",
            "email": "guest.claim@example.com",
            "email_verified": True,
            "iss": "https://accounts.google.com",
        }

    monkeypatch.setattr(auth, "_verify_google_id_token", verify_google_token)
    session_id = str(uuid4())
    guest_headers = {"x-session-id": session_id}
    await _create_guest_trip(client, trip_payload, guest_headers)
    await _create_guest_trip(client, {**trip_payload, "title": "Second Google trip"}, guest_headers)

    response = await client.post(
        "/api/v1/auth/google",
        json={"id_token": "test-google-token"},
        headers=guest_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["claimed_trips"] == 2

    account_trips = await client.get(
        "/api/v1/trips/me",
        headers={"Authorization": f"Bearer {response.json()['token']}"},
    )
    assert len(account_trips.json()["trips"]) == 2
