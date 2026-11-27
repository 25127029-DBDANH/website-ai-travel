"""Password recovery API integration tests. SMTP is replaced for every test."""

import asyncio
import hashlib
import logging
import re
import smtplib
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from jose import jwt
from sqlalchemy import inspect, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.v1.endpoints import auth
from app.core import rate_limit, security
from app.core.config import Settings, settings
from app.db import session
from app.db.models import Base, PasswordResetToken, User
from app.utils.time import utc_now

API = "/api/v1/auth"
PASSWORD = "InitialSaigon!2026"
NEW_PASSWORD = "NewTripSaigon!2026"
EMAIL = "an@example.test"
CODE_PATTERN = re.compile(r"[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){2}")


@pytest.fixture
async def test_database(tmp_path):
    # Separate connections are essential for the concurrent redemption tests.
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'recovery.db'}")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        yield engine, async_sessionmaker(engine, expire_on_commit=False)
    finally:
        await engine.dispose()


@pytest.fixture(autouse=True)
def smtp(monkeypatch):
    fake = MagicMock(spec=smtplib.SMTP)
    monkeypatch.setattr(smtplib, "SMTP", fake)
    monkeypatch.setattr(settings, "SMTP_USER", "mailer@example.test")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "smtp-secret")
    monkeypatch.setattr(settings, "SMTP_FROM", "")
    monkeypatch.setattr(settings, "PUBLIC_WEB_URL", "https://travel.example.test/")
    return fake


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def assert_error(response, status, code):
    assert response.status_code == status
    assert response.json() == {"detail": code}


async def register(client, username="traveler"):
    response = await client.post(
        f"{API}/register", json={"username": username, "password": PASSWORD}
    )
    assert response.status_code == 201
    return response.json()


async def login(client, password):
    return await client.post(f"{API}/login", json={"username": "traveler", "password": password})


def message(smtp):
    return smtp.return_value.__enter__.return_value.send_message.call_args.args[0]


async def add_email(client, smtp, headers, email=EMAIL):
    response = await client.post(f"{API}/email", json={"email": email}, headers=headers)
    assert response.status_code == 200
    mail = message(smtp)
    assert str(mail["To"]) == email.strip().lower()
    assert str(mail["From"]) == settings.SMTP_USER
    code = re.search(r"\b[0-9]{6}\b", mail.get_body(("plain",)).get_content()).group()
    assert code in mail.get_body(("html",)).get_content()
    assert code not in response.text
    return code


async def verify(client, headers, code):
    return await client.post(f"{API}/email/verify", json={"code": code}, headers=headers)


async def verified_account(client, smtp):
    account = await register(client)
    headers = bearer(account["token"])
    code = await add_email(client, smtp, headers)
    response = await verify(client, headers, code)
    assert response.status_code == 200
    assert response.json() == {"email_verified": True}
    return account


async def forgot(client, email=EMAIL):
    response = await client.post(f"{API}/forgot-password", json={"email": email})
    assert response.status_code == 200
    assert response.json() == {"success": True}


async def issue_link(client, smtp):
    before = smtp.call_count
    await forgot(client)
    assert smtp.call_count == before + 1
    mail = message(smtp)
    plain = mail.get_body(("plain",)).get_content()
    url, token = re.search(
        r"(https://travel\.example\.test/reset-password\?token=([\w-]+))", plain
    ).groups()
    assert url in mail.get_body(("html",)).get_content()
    return token


async def reset_link(client, token, password=NEW_PASSWORD):
    return await client.post(
        f"{API}/reset-password", json={"token": token, "new_password": password}
    )


async def reset_code(client, code, username="traveler", password=NEW_PASSWORD):
    return await client.post(
        f"{API}/reset-password/recovery-code",
        json={"username": username, "recovery_code": code, "new_password": password},
    )


async def test_recovery_code_rotation_and_password_policy(client, test_database):
    account = await register(client)
    code = account["recovery_code"]
    assert CODE_PATTERN.fullmatch(code)
    headers = bearer(account["token"])
    user = (await client.get(f"{API}/me", headers=headers)).json()["user"]
    assert user["has_recovery_code"] is True
    assert user["email_verified"] is False
    assert "recovery_code" not in user and "recovery_code_hash" not in user
    _, factory = test_database
    async with factory() as db:
        stored = await db.get(User, user["id"])
        assert security.verify_password(code.replace("-", ""), stored.recovery_code_hash)
    assert (await login(client, PASSWORD)).json()["recovery_code"] is None
    assert_error(await reset_code(client, code, password="abc"), 400, "AUTH_PASSWORD_TOO_SHORT")
    reset = await reset_code(client, "  " + code.lower().replace("-", " \t-"), " TRAVELER ")
    assert reset.status_code == 200
    new_code = reset.json()["recovery_code"]
    assert reset.json()["success"] and CODE_PATTERN.fullmatch(new_code) and new_code != code
    assert_error(await reset_code(client, code), 400, "AUTH_RECOVERY_INVALID")
    assert_error(await login(client, PASSWORD), 401, "AUTH_INVALID_CREDENTIALS")
    assert_error(await client.get(f"{API}/me", headers=headers), 401, "AUTH_TOKEN_EXPIRED")
    fresh = await login(client, NEW_PASSWORD)
    assert fresh.status_code == 200
    assert (await client.get(f"{API}/me", headers=bearer(fresh.json()["token"]))).status_code == 200
    assert (await reset_code(client, new_code, password=PASSWORD)).status_code == 200


async def test_recovery_failures_have_same_error_and_bcrypt_work(client, monkeypatch):
    account = await register(client)
    check = MagicMock(wraps=security.verify_password)
    monkeypatch.setattr(auth, "verify_password", check)
    assert_error(await reset_code(client, "wrong"), 400, "AUTH_RECOVERY_INVALID")
    assert_error(
        await reset_code(client, account["recovery_code"], "missing"), 400, "AUTH_RECOVERY_INVALID"
    )
    assert check.call_count == 2
    assert check.call_args.args[1] == security.DUMMY_HASH


async def test_recovery_limit_by_username_and_ip_expires(client, monkeypatch):
    ip = "192.0.2.1"
    monkeypatch.setattr(auth, "_client_ip", lambda request: ip)
    now = 1_000.0
    # Patch only the limiter's clock, leaving asyncio's monotonic clock untouched.
    monkeypatch.setattr(rate_limit, "time", MagicMock(monotonic=lambda: now))
    for _ in range(5):
        assert_error(await reset_code(client, "wrong"), 400, "AUTH_RECOVERY_INVALID")
    assert_error(await reset_code(client, "wrong", "different"), 429, "AUTH_RATE_LIMITED")
    ip = "192.0.2.2"
    assert_error(await reset_code(client, "wrong", " TRAVELER "), 429, "AUTH_RATE_LIMITED")
    now += 900
    assert_error(await reset_code(client, "wrong"), 400, "AUTH_RECOVERY_INVALID")


async def test_regeneration_requires_current_password_and_revokes_old_code(client):
    account = await register(client)
    headers = bearer(account["token"])
    path = f"{API}/recovery-code"
    assert_error(await client.post(path, json={"current_password": PASSWORD}), 401, "AUTH_REQUIRED")
    wrong = await client.post(path, json={"current_password": "wrong"}, headers=headers)
    assert_error(wrong, 403, "AUTH_PASSWORD_INVALID")
    result = await client.post(path, json={"current_password": PASSWORD}, headers=headers)
    assert result.status_code == 200 and CODE_PATTERN.fullmatch(result.json()["recovery_code"])
    assert_error(await reset_code(client, account["recovery_code"]), 400, "AUTH_RECOVERY_INVALID")
    assert (await reset_code(client, result.json()["recovery_code"])).status_code == 200


async def test_config_and_disabled_email(client, smtp, monkeypatch):
    account = await register(client)
    assert (await client.get(f"{API}/config")).json() == {"email_recovery_enabled": True}
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "")
    assert (await client.get(f"{API}/config")).json() == {"email_recovery_enabled": False}
    result = await client.post(
        f"{API}/email", json={"email": EMAIL}, headers=bearer(account["token"])
    )
    assert_error(result, 503, "EMAIL_DISABLED")
    await forgot(client)
    smtp.assert_not_called()


def test_production_email_defaults_and_warning(monkeypatch, caplog):
    for field in ("SMTP_HOST", "SMTP_PORT", "SMTP_FROM", "PUBLIC_WEB_URL"):
        monkeypatch.setenv(field, "")
    config = Settings(
        APP_ENV="production",
        JWT_SECRET="test-production-secret",
        SMTP_USER="sender@example.test",
        SMTP_PASSWORD="test-app-password",
        _env_file=None,
    )
    assert (config.SMTP_HOST, config.SMTP_PORT) == ("smtp.gmail.com", 587)
    assert config.PUBLIC_WEB_URL == "http://localhost:5173"
    assert config.SMTP_FROM == config.SMTP_USER
    assert "PUBLIC_WEB_URL" in caplog.text and config.SMTP_PASSWORD not in caplog.text


async def test_email_conflict_expiry_reissue_and_verification(client, smtp, monkeypatch):
    first, second = await register(client), await register(client, "traveler2")
    one, two = bearer(first["token"]), bearer(second["token"])
    now = utc_now()
    monkeypatch.setattr(auth, "utc_now", lambda: now)
    monkeypatch.setattr(auth.secrets, "randbelow", lambda n: 16)
    code = await add_email(client, smtp, one, EMAIL.upper())
    assert code == "000016"
    taken = await client.post(f"{API}/email", json={"email": EMAIL}, headers=two)
    assert_error(taken, 409, "AUTH_EMAIL_TAKEN")
    assert_error(await verify(client, two, code), 400, "AUTH_EMAIL_CODE_INVALID")
    assert_error(await verify(client, one, "000017"), 400, "AUTH_EMAIL_CODE_INVALID")
    now += timedelta(minutes=15)
    assert_error(await verify(client, one, code), 400, "AUTH_EMAIL_CODE_INVALID")
    monkeypatch.setattr(auth.secrets, "randbelow", lambda n: 17)
    new = await add_email(client, smtp, one)
    assert_error(await verify(client, one, code), 400, "AUTH_EMAIL_CODE_INVALID")
    assert (await verify(client, one, new)).json() == {"email_verified": True}
    me = (await client.get(f"{API}/me", headers=one)).json()["user"]
    assert me["email"] == EMAIL and me["email_verified"] is True
    assert_error(await verify(client, one, new), 400, "AUTH_EMAIL_CODE_INVALID")
    smtp.assert_called_with(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
    connection = smtp.return_value.__enter__.return_value
    assert connection.starttls.call_count == connection.login.call_count == 2


async def test_five_bad_verification_codes_cancel_challenge(client, smtp):
    headers = bearer((await register(client))["token"])
    code = await add_email(client, smtp, headers)
    wrong = f"{(int(code) + 1) % 1_000_000:06d}"
    for _ in range(5):
        assert_error(await verify(client, headers, wrong), 400, "AUTH_EMAIL_CODE_INVALID")
    assert_error(await verify(client, headers, code), 429, "AUTH_RATE_LIMITED")
    assert not (await client.get(f"{API}/me", headers=headers)).json()["user"]["email_verified"]
    fresh = await add_email(client, smtp, headers)
    assert (await verify(client, headers, fresh)).status_code == 200


async def test_forgot_sends_only_for_verified_password_account(client, smtp, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "mock-id")

    async def google_claims(*args, **kwargs):
        return {"sub": "google-only", "email": "google@example.test", "email_verified": True}

    monkeypatch.setattr(auth, "_verify_google_id_token", google_claims)
    google = (await client.post(f"{API}/google", json={"id_token": "mock-token"})).json()
    assert google["recovery_code"] is None and google["user"]["email_verified"]
    response = await client.post(
        f"{API}/recovery-code", json={"current_password": PASSWORD}, headers=bearer(google["token"])
    )
    assert_error(response, 409, "AUTH_PASSWORD_NOT_SET")
    headers = bearer((await register(client))["token"])
    code = await add_email(client, smtp, headers)
    await forgot(client, "missing@example.test")
    await forgot(client, google["user"]["email"])
    await forgot(client)
    assert smtp.call_count == 1
    assert (await verify(client, headers, code)).status_code == 200
    rate_limit.reset()
    await issue_link(client, smtp)
    assert smtp.call_count == 2


async def test_forgot_limits_by_email_and_ip(client, smtp, monkeypatch):
    await verified_account(client, smtp)
    ip = "192.0.2.1"
    monkeypatch.setattr(auth, "_client_ip", lambda request: ip)
    for _ in range(3):
        await issue_link(client, smtp)
    ip = "192.0.2.2"
    await forgot(client, EMAIL.upper())
    assert smtp.call_count == 4
    rate_limit.reset()
    for i in range(3):
        await forgot(client, f"unknown{i}@example.test")
    await forgot(client)
    assert smtp.call_count == 4


async def test_email_replacement_revokes_links_and_requires_verification(client, smtp):
    account = await verified_account(client, smtp)
    headers = bearer(account["token"])
    old_link = await issue_link(client, smtp)
    await add_email(client, smtp, headers, "new@example.test")
    assert_error(await reset_link(client, old_link), 400, "AUTH_RESET_TOKEN_INVALID")
    me = (await client.get(f"{API}/me", headers=headers)).json()["user"]
    assert me["email"] == "new@example.test" and me["email_verified"] is False
    await forgot(client)
    await forgot(client, "new@example.test")
    assert smtp.call_count == 3


async def test_concurrent_email_claims_have_only_one_owner(client, smtp):
    accounts = [await register(client, name) for name in ("one", "two")]
    responses = await asyncio.gather(
        *(
            client.post(f"{API}/email", headers=bearer(account["token"]), json={"email": EMAIL})
            for account in accounts
        )
    )
    assert sorted(r.status_code for r in responses) == [200, 409]
    assert_error(next(r for r in responses if r.status_code == 409), 409, "AUTH_EMAIL_TAKEN")
    assert smtp.call_count == 1


async def test_forgot_password_accepts_malformed_addresses_without_sending(client, smtp):
    for address in ("", "missing-domain", "an@[", "one@example.test, two@example.test"):
        await forgot(client, address)
    smtp.assert_not_called()


async def test_email_reset_policy_expiry_storage_and_single_use(
    client, smtp, monkeypatch, test_database
):
    account = await verified_account(client, smtp)
    now = utc_now()
    monkeypatch.setattr(auth, "utc_now", lambda: now)
    token = await issue_link(client, smtp)
    _, factory = test_database
    async with factory() as db:
        stored = await db.scalar(
            select(PasswordResetToken).where(PasswordResetToken.purpose == "reset")
        )
        assert stored.token_hash == hashlib.sha256(token.encode()).hexdigest()
        assert stored.expires_at == now + timedelta(minutes=30)
    assert_error(await reset_link(client, "wrong"), 400, "AUTH_RESET_TOKEN_INVALID")
    assert_error(await reset_link(client, token, "123"), 400, "AUTH_PASSWORD_TOO_SHORT")
    now += timedelta(minutes=30)
    assert_error(await reset_link(client, token), 400, "AUTH_RESET_TOKEN_INVALID")
    monkeypatch.setattr(auth, "utc_now", utc_now)
    token = await issue_link(client, smtp)
    sibling = await issue_link(client, smtp)
    success = await reset_link(client, token)
    assert success.status_code == 200 and success.json() == {"success": True}
    for used in (token, sibling):
        assert_error(await reset_link(client, used), 400, "AUTH_RESET_TOKEN_INVALID")
    assert_error(
        await client.get(f"{API}/me", headers=bearer(account["token"])), 401, "AUTH_TOKEN_EXPIRED"
    )
    fresh = await login(client, NEW_PASSWORD)
    assert (await client.get(f"{API}/me", headers=bearer(fresh.json()["token"]))).status_code == 200


async def test_password_change_revokes_links_and_same_second_jwt_but_accepts_legacy(
    client, smtp, monkeypatch
):
    frozen = datetime.now(timezone.utc)

    class FrozenClock(datetime):
        @classmethod
        def now(cls, tz):
            return frozen.astimezone(tz)

    monkeypatch.setattr(security, "datetime", FrozenClock)
    monkeypatch.setattr(auth, "utc_now", lambda: frozen.replace(tzinfo=None))
    account = await verified_account(client, smtp)
    token = await issue_link(client, smtp)
    headers = bearer(account["token"])
    result = await client.post(
        f"{API}/change-password",
        headers=headers,
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
    )
    assert result.status_code == 200 and result.json()["success"]
    fresh = result.json()["token"]
    assert (
        security.decode_access_token(account["token"])["iat"]
        == security.decode_access_token(fresh)["iat"]
    )
    assert_error(await client.get(f"{API}/me", headers=headers), 401, "AUTH_TOKEN_EXPIRED")
    assert (await client.get(f"{API}/me", headers=bearer(fresh))).status_code == 200
    assert_error(await reset_link(client, token), 400, "AUTH_RESET_TOKEN_INVALID")
    claims = {"sub": account["user"]["id"], "exp": frozen + timedelta(hours=1)}
    legacy = jwt.encode(claims, settings.JWT_SECRET, settings.JWT_ALGORITHM)
    assert (await client.get(f"{API}/me", headers=bearer(legacy))).status_code == 200
    claims["iat"] = int(frozen.timestamp()) - 1
    earlier = jwt.encode(claims, settings.JWT_SECRET, settings.JWT_ALGORITHM)
    assert_error(await client.get(f"{API}/me", headers=bearer(earlier)), 401, "AUTH_TOKEN_EXPIRED")


@pytest.mark.parametrize("method", ["link", "code"])
async def test_concurrent_redemptions_only_one_succeeds(client, smtp, method):
    account = await verified_account(client, smtp)
    token = await issue_link(client, smtp)
    if method == "link":
        requests = [reset_link(client, token) for _ in range(2)]
    else:
        requests = [reset_code(client, account["recovery_code"]) for _ in range(2)]
    results = await asyncio.gather(*requests)
    assert sorted(r.status_code for r in results) == [200, 400]
    assert_error(await reset_link(client, token), 400, "AUTH_RESET_TOKEN_INVALID")


async def test_smtp_failure_keeps_generic_response_and_secrets_out_of_logs(client, smtp, caplog):
    caplog.set_level(logging.INFO)
    account = await register(client)
    headers = bearer(account["token"])
    code = await add_email(client, smtp, headers)
    assert (await verify(client, headers, code)).status_code == 200
    token = await issue_link(client, smtp)
    smtp.side_effect = smtplib.SMTPException(f"{code} {token} {settings.SMTP_PASSWORD}")
    await forgot(client)
    assert smtp.call_count == 3
    assert "Recovery email delivery failed" in caplog.text
    for secret in (
        code,
        token,
        EMAIL,
        PASSWORD,
        settings.SMTP_PASSWORD,
        account["recovery_code"],
        account["token"],
    ):
        assert secret not in caplog.text


async def test_migration_preserves_legacy_users_and_creates_recovery_table(tmp_path, monkeypatch):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'legacy.db'}")
    monkeypatch.setattr(session, "engine", engine)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text("CREATE TABLE users (id VARCHAR(32) PRIMARY KEY, username VARCHAR(60))")
            )
            await conn.execute(text("INSERT INTO users VALUES ('123', 'existing')"))
        await session.create_tables()
        await session.create_tables()
        async with engine.begin() as conn:
            row = (
                await conn.execute(
                    text(
                        "SELECT username, email_verified, password_changed_at, recovery_code_hash "
                        "FROM users"
                    )
                )
            ).one()
            assert tuple(row) == ("existing", False, None, None)
            assert await conn.run_sync(lambda c: inspect(c).has_table("password_reset_tokens"))
    finally:
        await engine.dispose()
