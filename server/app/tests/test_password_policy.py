"""Password policy, username rules, anti-enumeration, and login rate-limit tests."""

from __future__ import annotations

import unicodedata

import pytest
from httpx import AsyncClient


@pytest.mark.integration
async def test_register_rejects_common_password(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "policy_user", "password": "password1"},
    )
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "AUTH_PASSWORD_COMMON"


@pytest.mark.integration
async def test_register_rejects_weak_short_passwords(client: AsyncClient) -> None:
    for weak in ("abcdefgh", "12345678"):
        response = await client.post(
            "/api/v1/auth/register",
            json={"username": "policy_weak", "password": weak},
        )
        assert response.status_code == 400, response.text
        assert response.json()["detail"] == "AUTH_PASSWORD_TOO_WEAK"


@pytest.mark.integration
async def test_register_rejects_too_short_password(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "policy_short", "password": "short1"},
    )
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "AUTH_PASSWORD_TOO_SHORT"


@pytest.mark.integration
async def test_register_accepts_8_char_lower_and_digit_not_common(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "policy_ok8", "password": "k9m2x7q4"},
    )
    assert response.status_code == 201, response.text


@pytest.mark.integration
async def test_register_accepts_15_char_passphrase_without_digits(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "policy_ok15", "password": "qwxzplmnkjhfgds"},
    )
    assert response.status_code == 201, response.text


@pytest.mark.integration
async def test_register_rejects_password_over_64_chars(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "policy_long65", "password": "a" * 64 + "1"},
    )
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "AUTH_PASSWORD_TOO_LONG"


@pytest.mark.integration
async def test_register_rejects_password_over_72_utf8_bytes(client: AsyncClient) -> None:
    vietnamese_30 = "ệ" * 30  # 30 code points, 90 UTF-8 bytes
    assert len(vietnamese_30) == 30
    assert len(vietnamese_30.encode("utf-8")) > 72

    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "policy_utf8", "password": vietnamese_30},
    )
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "AUTH_PASSWORD_TOO_LONG"


@pytest.mark.integration
async def test_register_rejects_password_containing_username(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "SaigonDev", "password": "my_saigondev_99"},
    )
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "AUTH_PASSWORD_CONTAINS_USERNAME"


@pytest.mark.integration
async def test_register_rejects_reserved_username(client: AsyncClient) -> None:
    for name in ("admin", "ADMIN", "saigon_guide"):
        response = await client.post(
            "/api/v1/auth/register",
            json={"username": name, "password": "SaigonTrip!2026"},
        )
        assert response.status_code == 400, response.text
        assert response.json()["detail"] == "AUTH_USERNAME_RESERVED"


@pytest.mark.integration
async def test_register_rejects_invalid_usernames(client: AsyncClient) -> None:
    for bad in ("_abc", "abc_", "a__b", "ab", "bad-name", "a" * 31):
        response = await client.post(
            "/api/v1/auth/register",
            json={"username": bad, "password": "SaigonTrip!2026"},
        )
        assert response.status_code == 400, response.text
        assert response.json()["detail"] == "AUTH_USERNAME_INVALID"


@pytest.mark.integration
async def test_register_username_case_insensitive_conflict_and_login(client: AsyncClient) -> None:
    first = await client.post(
        "/api/v1/auth/register",
        json={"username": "Hung_qa", "password": "SaigonTrip!2026"},
    )
    assert first.status_code == 201, first.text
    assert first.json()["user"]["username"] == "Hung_qa"

    duplicate = await client.post(
        "/api/v1/auth/register",
        json={"username": "hung_qa", "password": "SaigonTrip!2026"},
    )
    assert duplicate.status_code == 409, duplicate.text
    assert duplicate.json()["detail"] == "AUTH_USERNAME_TAKEN"

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "HUNG_QA", "password": "SaigonTrip!2026"},
    )
    assert login_resp.status_code == 200, login_resp.text
    assert login_resp.json()["user"]["username"] == "Hung_qa"
    assert login_resp.json().get("token")


@pytest.mark.integration
async def test_login_rate_limits_after_5_failed_attempts(client: AsyncClient) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={"username": "rate_user", "password": "SaigonTrip!2026"},
    )
    assert reg.status_code == 201, reg.text

    for _ in range(5):
        failed = await client.post(
            "/api/v1/auth/login",
            json={"username": "rate_user", "password": "WrongPassword99"},
        )
        assert failed.status_code == 401, failed.text
        assert failed.json()["detail"] == "AUTH_INVALID_CREDENTIALS"

    # 6th attempt is blocked BEFORE password verification (even with the correct password)
    blocked = await client.post(
        "/api/v1/auth/login",
        json={"username": "RATE_USER", "password": "SaigonTrip!2026"},
    )
    assert blocked.status_code == 429, blocked.text
    assert blocked.json()["detail"] == "AUTH_RATE_LIMITED"


@pytest.mark.integration
async def test_login_success_clears_failed_attempt_counter(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"username": "reset_user", "password": "SaigonTrip!2026"},
    )

    for _ in range(4):
        failed = await client.post(
            "/api/v1/auth/login",
            json={"username": "reset_user", "password": "WrongPassword99"},
        )
        assert failed.status_code == 401

    ok = await client.post(
        "/api/v1/auth/login",
        json={"username": "reset_user", "password": "SaigonTrip!2026"},
    )
    assert ok.status_code == 200

    # Can fail 5 more times before being rate limited
    for _ in range(5):
        failed = await client.post(
            "/api/v1/auth/login",
            json={"username": "reset_user", "password": "WrongPassword99"},
        )
        assert failed.status_code == 401


def test_security_nfc_and_72_byte_limit() -> None:
    from app.core.security import DUMMY_HASH, hash_password, verify_password

    assert DUMMY_HASH.startswith("$2")

    nfc = unicodedata.normalize("NFC", "café_2026")
    nfd = unicodedata.normalize("NFD", "café_2026")
    assert nfc != nfd

    hashed = hash_password(nfc)
    assert verify_password(nfd, hashed) is True

    too_long = "a" * 73
    with pytest.raises(ValueError):
        hash_password(too_long)
    assert verify_password(too_long, hashed) is False
