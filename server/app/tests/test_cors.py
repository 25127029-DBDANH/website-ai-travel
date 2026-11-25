"""Tests for CORS configuration including optional preview origin regex."""

from __future__ import annotations

import logging

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from main import configure_cors

PREVIEW_REGEX = r"^https://website-ai-travel-[a-z0-9-]+-saigon-team\.vercel\.app$"
PROD_ORIGIN = "https://website-ai-travel.vercel.app"
PREVIEW_ORIGIN = "https://website-ai-travel-a1b2c3d4e-saigon-team.vercel.app"


def _build_cors_app(
    *,
    cors_origins: str | None = PROD_ORIGIN,
    cors_origin_regex: str | None = None,
) -> FastAPI:
    test_app = FastAPI()

    @test_app.get("/ping")
    async def ping() -> dict[str, str]:
        return {"status": "ok"}

    configure_cors(
        test_app,
        cors_origins=cors_origins,
        cors_origin_regex=cors_origin_regex,
    )
    return test_app


async def _preflight(application: FastAPI, origin: str):
    async with AsyncClient(
        transport=ASGITransport(app=application),
        base_url="http://test",
    ) as client:
        return await client.options(
            "/ping",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization, Content-Type",
            },
        )


@pytest.mark.asyncio
async def test_cors_allows_preview_origin_matching_regex() -> None:
    test_app = _build_cors_app(cors_origin_regex=PREVIEW_REGEX)

    response = await _preflight(test_app, PREVIEW_ORIGIN)

    assert response.status_code == 200, response.text
    assert response.headers.get("access-control-allow-origin") == PREVIEW_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "foreign_origin",
    [
        "https://evil.vercel.app",
        "https://website-ai-travel-a1b2c3d4e-other-team.vercel.app",
        "https://website-ai-travel-a1b2c3d4e-saigon-team.vercel.app.evil.com",
        "http://website-ai-travel-a1b2c3d4e-saigon-team.vercel.app",
    ],
)
async def test_cors_rejects_unmatched_origins(foreign_origin: str) -> None:
    test_app = _build_cors_app(cors_origin_regex=PREVIEW_REGEX)

    response = await _preflight(test_app, foreign_origin)

    assert "access-control-allow-origin" not in response.headers


@pytest.mark.asyncio
async def test_cors_empty_regex_preserves_explicit_origins_only() -> None:
    test_app = _build_cors_app(cors_origins=PROD_ORIGIN, cors_origin_regex="")

    allowed = await _preflight(test_app, PROD_ORIGIN)
    assert allowed.status_code == 200, allowed.text
    assert allowed.headers.get("access-control-allow-origin") == PROD_ORIGIN

    preview = await _preflight(test_app, PREVIEW_ORIGIN)
    assert "access-control-allow-origin" not in preview.headers

    evil = await _preflight(test_app, "https://evil.vercel.app")
    assert "access-control-allow-origin" not in evil.headers


@pytest.mark.asyncio
async def test_cors_invalid_regex_logs_warning_and_falls_back(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.WARNING, logger="main"):
        test_app = _build_cors_app(
            cors_origins=PROD_ORIGIN,
            cors_origin_regex="[unclosed-regex",
        )

    assert any("CORS_ORIGIN_REGEX" in record.message for record in caplog.records)

    allowed = await _preflight(test_app, PROD_ORIGIN)
    assert allowed.status_code == 200, allowed.text
    assert allowed.headers.get("access-control-allow-origin") == PROD_ORIGIN

    evil = await _preflight(test_app, "https://evil.vercel.app")
    assert "access-control-allow-origin" not in evil.headers


@pytest.mark.asyncio
async def test_cors_reads_origin_regex_from_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CORS_ORIGINS", PROD_ORIGIN)
    monkeypatch.setenv("CORS_ORIGIN_REGEX", PREVIEW_REGEX)

    test_app = _build_cors_app(cors_origins=None, cors_origin_regex=None)

    response = await _preflight(test_app, PREVIEW_ORIGIN)
    assert response.status_code == 200, response.text
    assert response.headers.get("access-control-allow-origin") == PREVIEW_ORIGIN

    rejected = await _preflight(test_app, "https://evil.vercel.app")
    assert "access-control-allow-origin" not in rejected.headers
