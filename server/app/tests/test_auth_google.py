"""Tests for Google Sign-In, lightweight migrations, Neon URL normalization, and prod guards."""

from __future__ import annotations

import importlib
import logging
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, inspect, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import DEFAULT_JWT_SECRET, Settings, settings
from app.core.password_policy import validate_username
from app.core.security import is_usable_password, verify_password
from app.db import session as session_module
from app.db.migrations import ensure_schema
from app.db.models import User
from app.db.session import create_tables, get_db, normalize_database_url
from app.tests.conftest import create_trip

TEST_GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com"


def _patch_google_verify(
    monkeypatch: pytest.MonkeyPatch,
    handler: Any,
    *,
    client_id: str = TEST_GOOGLE_CLIENT_ID,
) -> None:
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", client_id)
    monkeypatch.setattr("google.oauth2.id_token.verify_oauth2_token", handler)


def _make_claims(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "iss": "https://accounts.google.com",
        "aud": TEST_GOOGLE_CLIENT_ID,
        "sub": "109876543210987654321",
        "email": "Nguyen.Van.A@gmail.com",
        "email_verified": True,
        "name": "Nguyễn Văn A",
        "picture": "https://example.com/avatar.jpg",
    }
    base.update(overrides)
    return base


@pytest.mark.integration
async def test_google_login_creates_new_user_with_valid_username_and_no_password(
    client: AsyncClient,
    test_database: tuple[Any, async_sessionmaker[AsyncSession]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_google_verify(monkeypatch, lambda token, req, aud: _make_claims())

    response = await client.post("/api/v1/auth/google", json={"id_token": "valid-google-token"})

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["token"]
    assert body["claimed_trips"] == 0

    user = body["user"]
    assert validate_username(user["username"]) == user["username"]
    assert user["username"] == "nguyen_van_a"
    assert user["email"] == "nguyen.van.a@gmail.com"
    assert user["full_name"] == "Nguyễn Văn A"
    assert user["avatar_url"] == "https://example.com/avatar.jpg"
    assert user["has_password"] is False
    assert "hashed_password" not in user
    assert "password" not in user

    # Verify issued JWT works on /me and exposes email + has_password=False
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['token']}"},
    )
    assert me_resp.status_code == 200, me_resp.text
    assert me_resp.json()["user"]["has_password"] is False
    assert me_resp.json()["user"]["email"] == "nguyen.van.a@gmail.com"

    # Verify DB stores unusable sentinel hash
    _, session_factory = test_database
    async with session_factory() as db:
        row = (await db.execute(select(User).where(User.id == user["id"]))).scalar_one()
        assert row.google_sub == "109876543210987654321"
        assert row.hashed_password.startswith("!google:")
        assert is_usable_password(row.hashed_password) is False


@pytest.mark.integration
async def test_google_login_repeat_same_sub_reuses_user_and_fills_only_blank_fields(
    client: AsyncClient,
    test_database: tuple[Any, async_sessionmaker[AsyncSession]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    first_claims = _make_claims(
        sub="sub-repeat-001",
        email="repeat.user@gmail.com",
        name="",
        picture="",
    )
    _patch_google_verify(monkeypatch, lambda token, req, aud: first_claims)

    first = await client.post("/api/v1/auth/google", json={"id_token": "token-1"})
    assert first.status_code == 200, first.text
    first_user = first.json()["user"]
    assert first_user["full_name"] is None
    assert first_user["avatar_url"] is None

    second_claims = _make_claims(
        sub="sub-repeat-001",
        email="changed.email@gmail.com",
        name="Lần Hai",
        picture="https://example.com/second.png",
    )
    _patch_google_verify(monkeypatch, lambda token, req, aud: second_claims)

    second = await client.post("/api/v1/auth/google", json={"id_token": "token-2"})
    assert second.status_code == 200, second.text
    second_user = second.json()["user"]
    assert second_user["id"] == first_user["id"]
    assert second_user["username"] == first_user["username"]
    assert second_user["email"] == "repeat.user@gmail.com"
    assert second_user["full_name"] == "Lần Hai"
    assert second_user["avatar_url"] == "https://example.com/second.png"

    third_claims = _make_claims(
        sub="sub-repeat-001",
        email="another@gmail.com",
        name="Tên Mới Không Ghi Đè",
        picture="https://example.com/third.png",
    )
    _patch_google_verify(monkeypatch, lambda token, req, aud: third_claims)
    third = await client.post("/api/v1/auth/google", json={"id_token": "token-3"})
    assert third.status_code == 200, third.text
    assert third.json()["user"]["full_name"] == "Lần Hai"
    assert third.json()["user"]["avatar_url"] == "https://example.com/second.png"

    _, session_factory = test_database
    async with session_factory() as db:
        count = await db.scalar(select(func.count()).select_from(User))
        assert count == 1


@pytest.mark.integration
async def test_google_login_reserved_short_and_colliding_emails_generate_valid_usernames(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Reserved local part: admin@...
    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(sub="sub-admin-1", email="admin@example.com"),
    )
    res_admin = await client.post("/api/v1/auth/google", json={"id_token": "tok-admin"})
    assert res_admin.status_code == 200, res_admin.text
    admin_username = res_admin.json()["user"]["username"]
    assert admin_username.startswith("admin_")
    assert len(admin_username) == len("admin_") + 4
    assert validate_username(admin_username) == admin_username

    # Short local part (< 3 chars)
    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(sub="sub-short-1", email="ab@example.com"),
    )
    res_short = await client.post("/api/v1/auth/google", json={"id_token": "tok-short"})
    assert res_short.status_code == 200, res_short.text
    short_username = res_short.json()["user"]["username"]
    assert short_username.startswith("ab_")
    assert validate_username(short_username) == short_username

    # Punctuation-only local part
    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(sub="sub-punct-1", email="...@example.com"),
    )
    res_punct = await client.post("/api/v1/auth/google", json={"id_token": "tok-punct"})
    assert res_punct.status_code == 200, res_punct.text
    assert validate_username(res_punct.json()["user"]["username"])

    # Existing password user with same username (different case) must NOT be linked
    reg = await client.post(
        "/api/v1/auth/register",
        json={"username": "SaigonTraveler", "password": "SaigonTrip!2026"},
    )
    assert reg.status_code == 201, reg.text
    existing_id = reg.json()["user"]["id"]

    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(
            sub="sub-collide-1", email="saigontraveler@example.com"
        ),
    )
    res_collide = await client.post("/api/v1/auth/google", json={"id_token": "tok-collide"})
    assert res_collide.status_code == 200, res_collide.text
    assert res_collide.json()["user"]["id"] != existing_id
    collide_name = res_collide.json()["user"]["username"]
    assert collide_name.startswith("saigontraveler_")
    assert validate_username(collide_name) == collide_name

    # Long 26-char collision must still fit within 30-char limit when suffix added
    long_base = "a" * 26
    reg_long = await client.post(
        "/api/v1/auth/register",
        json={"username": long_base, "password": "SaigonTrip!2026"},
    )
    assert reg_long.status_code == 201, reg_long.text
    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(sub="sub-long-1", email=f"{'a' * 30}@example.com"),
    )
    res_long = await client.post("/api/v1/auth/google", json={"id_token": "tok-long"})
    assert res_long.status_code == 200, res_long.text
    long_username = res_long.json()["user"]["username"]
    assert len(long_username) <= 30
    assert validate_username(long_username) == long_username


@pytest.mark.integration
async def test_google_login_rejects_value_error_as_401(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _raise_value_error(token: str, req: Any, aud: str) -> dict[str, Any]:
        raise ValueError("Invalid or expired ID token")

    _patch_google_verify(monkeypatch, _raise_value_error)

    response = await client.post("/api/v1/auth/google", json={"id_token": "bad-token"})

    assert response.status_code == 401, response.text
    assert response.json()["detail"] == "AUTH_GOOGLE_INVALID"


@pytest.mark.integration
async def test_google_login_rejects_unverified_email_and_bad_issuer(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(email_verified=False),
    )
    unverified = await client.post("/api/v1/auth/google", json={"id_token": "tok-unverified"})
    assert unverified.status_code == 401, unverified.text
    assert unverified.json()["detail"] == "AUTH_GOOGLE_INVALID"

    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(iss="https://evil.example.com"),
    )
    bad_iss = await client.post("/api/v1/auth/google", json={"id_token": "tok-bad-iss"})
    assert bad_iss.status_code == 401, bad_iss.text
    assert bad_iss.json()["detail"] == "AUTH_GOOGLE_INVALID"

    # Bare accounts.google.com issuer is also valid per Google OIDC spec
    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(sub="sub-bare-iss", iss="accounts.google.com"),
    )
    bare_ok = await client.post("/api/v1/auth/google", json={"id_token": "tok-bare-iss"})
    assert bare_ok.status_code == 200, bare_ok.text


@pytest.mark.integration
async def test_google_login_returns_503_when_client_id_empty(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")

    response = await client.post("/api/v1/auth/google", json={"id_token": "any-token"})

    assert response.status_code == 503, response.text
    assert response.json()["detail"] == "AUTH_GOOGLE_NOT_CONFIGURED"


@pytest.mark.integration
async def test_google_login_rate_limits_repeated_failures_by_ip(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _always_fail(token: str, req: Any, aud: str) -> dict[str, Any]:
        raise ValueError("bad token")

    _patch_google_verify(monkeypatch, _always_fail)

    for _ in range(5):
        resp = await client.post("/api/v1/auth/google", json={"id_token": "bad-token"})
        assert resp.status_code == 401

    blocked = await client.post("/api/v1/auth/google", json={"id_token": "bad-token"})
    assert blocked.status_code == 429, blocked.text
    assert blocked.json()["detail"] == "AUTH_RATE_LIMITED"


@pytest.mark.integration
async def test_password_login_for_google_user_returns_401_not_500(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    assert verify_password("anything", "!google:unusable-sentinel") is False
    assert verify_password("anything", "not-a-valid-bcrypt-hash") is False

    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(sub="sub-pw-login", email="googleonly@example.com"),
    )
    created = await client.post("/api/v1/auth/google", json={"id_token": "tok-googleonly"})
    assert created.status_code == 200, created.text
    username = created.json()["user"]["username"]

    google_pw_attempt = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "SomePassword123"},
    )
    unknown_attempt = await client.post(
        "/api/v1/auth/login",
        json={"username": "no_such_user_xyz", "password": "SomePassword123"},
    )

    assert google_pw_attempt.status_code == 401, google_pw_attempt.text
    assert google_pw_attempt.json() == unknown_attempt.json()
    assert google_pw_attempt.json()["detail"] == "AUTH_INVALID_CREDENTIALS"


@pytest.mark.integration
async def test_delete_google_account_with_matching_and_mismatched_id_token(
    client: AsyncClient,
    trip_payload: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _verify_by_token(token: str, req: Any, aud: str) -> dict[str, Any]:
        if token == "token-owner":
            return _make_claims(sub="sub-delete-owner", email="owner.del@example.com")
        if token == "token-other":
            return _make_claims(sub="sub-someone-else", email="other@example.com")
        raise ValueError("Invalid token")

    _patch_google_verify(monkeypatch, _verify_by_token)

    login_resp = await client.post("/api/v1/auth/google", json={"id_token": "token-owner"})
    assert login_resp.status_code == 200, login_resp.text
    jwt_token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {jwt_token}"}

    # Attach a trip to verify explicit cascade deletion works
    await create_trip(client, trip_payload, auth_token=jwt_token)

    # Missing id_token -> 403
    missing = await client.request("DELETE", "/api/v1/auth/me", json={}, headers=headers)
    assert missing.status_code == 403, missing.text
    assert missing.json()["detail"] == "AUTH_GOOGLE_INVALID"

    # Mismatched sub -> 403 and account remains active
    wrong_sub = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        json={"id_token": "token-other"},
        headers=headers,
    )
    assert wrong_sub.status_code == 403, wrong_sub.text
    assert wrong_sub.json()["detail"] == "AUTH_GOOGLE_INVALID"

    still_here = await client.get("/api/v1/auth/me", headers=headers)
    assert still_here.status_code == 200

    # Matching sub -> 200 and account is deleted
    deleted = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        json={"id_token": "token-owner"},
        headers=headers,
    )
    assert deleted.status_code == 200, deleted.text
    assert deleted.json() == {"success": True}

    after_delete = await client.get("/api/v1/auth/me", headers=headers)
    assert after_delete.status_code == 401


@pytest.mark.integration
async def test_delete_password_account_requires_valid_password(client: AsyncClient) -> None:
    reg = await client.post(
        "/api/v1/auth/register",
        json={"username": "pw_del_user", "password": "SaigonTrip!2026"},
    )
    assert reg.status_code == 201, reg.text
    assert reg.json()["user"]["has_password"] is True
    assert reg.json()["user"]["email"] is None
    headers = {"Authorization": f"Bearer {reg.json()['token']}"}

    missing = await client.request("DELETE", "/api/v1/auth/me", json={}, headers=headers)
    assert missing.status_code == 403
    assert missing.json()["detail"] == "AUTH_PASSWORD_INVALID"

    wrong = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        json={"password": "WrongPassword99"},
        headers=headers,
    )
    assert wrong.status_code == 403
    assert wrong.json()["detail"] == "AUTH_PASSWORD_INVALID"

    ok = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        json={"password": "SaigonTrip!2026"},
        headers=headers,
    )
    assert ok.status_code == 200, ok.text
    assert ok.json() == {"success": True}


@pytest.mark.integration
async def test_migration_upgrades_legacy_users_table_and_allows_google_auth(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db_file = tmp_path / "legacy_users.db"
    temp_engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )

    try:
        # 1. Create legacy users table WITHOUT email and google_sub + seed existing row
        async with temp_engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    CREATE TABLE users (
                        id VARCHAR(32) PRIMARY KEY,
                        username VARCHAR(60) NOT NULL UNIQUE,
                        hashed_password TEXT NOT NULL,
                        full_name VARCHAR(120),
                        avatar_url TEXT,
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL
                    )
                    """
                )
            )
            await conn.execute(
                text(
                    """
                    INSERT INTO users
                        (id, username, hashed_password, full_name, avatar_url,
                         is_active, created_at, updated_at)
                    VALUES
                        ('legacy01', 'legacy_user', '$2b$12$placeholderhashvalue',
                         'Legacy User', NULL, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00')
                    """
                )
            )

        # 2. Run create_tables() against temp DB -> must add missing columns & unique index
        monkeypatch.setattr(session_module, "engine", temp_engine)
        await create_tables()

        async with temp_engine.begin() as conn:
            cols = await conn.run_sync(
                lambda sc: {c["name"] for c in inspect(sc).get_columns("users")}
            )
            indexes = await conn.run_sync(lambda sc: inspect(sc).get_indexes("users"))
            # 3. Calling ensure_schema a second time must be idempotent
            await ensure_schema(conn)

        assert "email" in cols
        assert "google_sub" in cols
        google_sub_idx = next(
            (idx for idx in indexes if idx["name"] == "ix_users_google_sub"),
            None,
        )
        assert google_sub_idx is not None
        assert bool(google_sub_idx["unique"]) is True

        # 4. Run POST /api/v1/auth/google against the migrated DB
        _patch_google_verify(
            monkeypatch,
            lambda token, req, aud: _make_claims(
                sub="sub-migrated-1", email="migrated.user@gmail.com"
            ),
        )
        session_factory = async_sessionmaker(temp_engine, expire_on_commit=False)
        application = importlib.import_module("main").app

        async def override_get_db() -> AsyncIterator[AsyncSession]:
            async with session_factory() as db:
                try:
                    yield db
                    await db.commit()
                except Exception:
                    await db.rollback()
                    raise

        application.dependency_overrides[get_db] = override_get_db
        try:
            async with AsyncClient(
                transport=ASGITransport(app=application),
                base_url="http://test",
            ) as migrated_client:
                resp = await migrated_client.post(
                    "/api/v1/auth/google",
                    json={"id_token": "tok-migrated"},
                )
        finally:
            application.dependency_overrides.pop(get_db, None)

        assert resp.status_code == 200, resp.text
        assert resp.json()["user"]["email"] == "migrated.user@gmail.com"
        assert resp.json()["user"]["has_password"] is False

        # Legacy row is untouched alongside the new Google user
        async with session_factory() as db:
            legacy = (await db.execute(select(User).where(User.id == "legacy01"))).scalar_one()
            assert legacy.username == "legacy_user"
            assert legacy.email is None
            assert legacy.google_sub is None
    finally:
        await temp_engine.dispose()


def test_normalize_database_url_neon_postgres_and_sqlite() -> None:
    neon_url = (
        "postgresql://u:p@ep-x.ap-southeast-1.aws.neon.tech/db"
        "?sslmode=require&channel_binding=require"
    )
    async_url, connect_args = normalize_database_url(neon_url)

    assert async_url == "postgresql+asyncpg://u:p@ep-x.ap-southeast-1.aws.neon.tech/db"
    assert "sslmode" not in async_url
    assert "channel_binding" not in async_url
    assert connect_args == {"ssl": "require"}

    pg_verify, pg_args = normalize_database_url(
        "postgres://u:p@db.example.com:5432/mydb?sslmode=verify-full&application_name=saigon"
    )
    assert pg_verify == "postgresql+asyncpg://u:p@db.example.com:5432/mydb?application_name=saigon"
    assert pg_args == {"ssl": "require"}

    pg_plain, plain_args = normalize_database_url(
        "postgresql://u:p@localhost:5432/mydb?sslmode=disable"
    )
    assert pg_plain == "postgresql+asyncpg://u:p@localhost:5432/mydb"
    assert plain_args == {}

    sqlite_url, sqlite_args = normalize_database_url("sqlite:///./travel.db")
    assert sqlite_url == "sqlite+aiosqlite:///./travel.db"
    assert sqlite_args == {"check_same_thread": False}


def test_production_env_rejects_default_jwt_secret_and_warns_on_sqlite(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(APP_ENV="production", JWT_SECRET=DEFAULT_JWT_SECRET, _env_file=None)

    prod_sqlite = Settings(
        APP_ENV="production",
        JWT_SECRET="a-real-production-random-secret-key",
        DATABASE_URL="sqlite+aiosqlite:///./travel.db",
        _env_file=None,
    )
    with caplog.at_level(logging.WARNING, logger="app.core.config"):
        prod_sqlite.validate_runtime_config()

    assert any("SQLite" in record.getMessage() for record in caplog.records)


@pytest.mark.asyncio
async def test_lifespan_raises_on_production_default_jwt_secret(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    main_mod = importlib.import_module("main")
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "JWT_SECRET", DEFAULT_JWT_SECRET)

    with pytest.raises(ValueError, match="JWT_SECRET"):
        async with main_mod.lifespan(main_mod.app):
            pass


@pytest.mark.integration
async def test_google_login_logs_do_not_leak_token_or_email(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    secret_token = "eyJhbGciOiJSUzI1NiJ9.super-secret-id-token-payload.signature"
    secret_email = "private.person.123@gmail.com"
    _patch_google_verify(
        monkeypatch,
        lambda token, req, aud: _make_claims(sub="112233445566778899", email=secret_email),
    )

    with caplog.at_level(logging.INFO, logger="app.api.v1.endpoints.auth"):
        resp = await client.post("/api/v1/auth/google", json={"id_token": secret_token})

    assert resp.status_code == 200, resp.text
    combined_logs = "\n".join(record.getMessage() for record in caplog.records)
    assert secret_token not in combined_logs
    assert secret_email not in combined_logs
    assert "1122...99" in combined_logs
