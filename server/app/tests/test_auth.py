"""Authentication API contract tests from docs/openapi.yaml."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.integration
async def test_register_returns_token_and_never_returns_password_hash(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "qa_traveler", "password": "SaigonTrip!2026"},
    )

    assert response.status_code == 201, response.text
    result = response.json()
    assert result.get("token")
    assert result.get("user", {}).get("username") == "qa_traveler"
    assert "password" not in result.get("user", {})
    assert "password_hash" not in result.get("user", {})


@pytest.mark.integration
async def test_register_rejects_duplicate_username_case_insensitively(client: AsyncClient) -> None:
    first = await client.post(
        "/api/v1/auth/register",
        json={"username": "SaigonQA", "password": "SaigonTrip!2026"},
    )
    second = await client.post(
        "/api/v1/auth/register",
        json={"username": "saigonqa", "password": "AnotherTrip!2026"},
    )

    assert first.status_code == 201, first.text
    assert second.status_code == 409, second.text
    assert "AUTH_USERNAME_TAKEN" in second.text


@pytest.mark.integration
async def test_login_uses_one_generic_error_for_unknown_user_and_wrong_password(
    client: AsyncClient,
) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"username": "same_error_user", "password": "SaigonTrip!2026"},
    )
    wrong_password = await client.post(
        "/api/v1/auth/login",
        json={"username": "same_error_user", "password": "incorrect-password"},
    )
    missing_user = await client.post(
        "/api/v1/auth/login",
        json={"username": "no_such_user", "password": "incorrect-password"},
    )

    assert wrong_password.status_code == missing_user.status_code == 401
    assert wrong_password.json() == missing_user.json()


@pytest.mark.integration
async def test_login_returns_a_bearer_token_for_valid_credentials(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"username": "login_user", "password": "SaigonTrip!2026"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "login_user", "password": "SaigonTrip!2026"},
    )

    assert response.status_code == 200, response.text
    assert response.json().get("token")


@pytest.mark.integration
async def test_invalid_bearer_token_is_rejected(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"}
    )

    assert response.status_code == 401
