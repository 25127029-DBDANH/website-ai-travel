"""
main.py — FastAPI application entry point for Sài Gòn Guide.
Authors : Đỗ Nguyễn An Khang (Auth & Trips), Ngô Tấn Đạt (Places),
          Lê Hữu Lam (Gemini AI), Đàng Minh Hạo (Calendar)
"""

from __future__ import annotations

import logging
import os
import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

load_dotenv()

from app.api.v1.api import api_router  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.db.models import Place  # noqa: E402
from app.db.session import create_tables, engine, get_db  # noqa: E402
from app.services.gemini_service import GeminiService  # noqa: E402

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — initialize Gemini service, ORM tables, and 327 HCMC places seed
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings.validate_runtime_config()
    application.state.gemini_service = GeminiService(
        api_key=os.getenv("GEMINI_API_KEY"),
        model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
    )
    try:
        await create_tables()
        from app.db.hcmc_data import seed_places

        await seed_places()
        logger.info("Synchronized the local HCMC place catalog.")
    except Exception:
        logger.exception("Database initialization or place seeding failed.")
    try:
        yield
    finally:
        application.state.gemini_service = None
        await engine.dispose()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="🧭 Sài Gòn Guide — AI Travel Planner API",
    description="Backend API for the HCMC AI Travel Planner — CSC10014 Group 7",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
def _parse_cors_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _resolve_cors_origin_regex(raw_regex: str | None) -> str | None:
    """Validate optional CORS_ORIGIN_REGEX; return None when unset or invalid.

    Anchor the regex with ``^...$`` and scope it to this project and Vercel
    team slug, for example::

        ^https://website-ai-travel-[a-z0-9-]+-<team-slug>\\.vercel\\.app$

    Never use ``.*\\.vercel\\.app``, which would open CORS to every app on Vercel.
    """
    if not raw_regex:
        return None
    pattern = raw_regex.strip()
    if not pattern:
        return None
    try:
        re.compile(pattern)
    except re.error as exc:
        logger.warning(
            "Invalid CORS_ORIGIN_REGEX %r (%s); ignoring regex and using CORS_ORIGINS only.",
            pattern,
            exc,
        )
        return None
    return pattern


def configure_cors(
    application: FastAPI,
    *,
    cors_origins: str | None = None,
    cors_origin_regex: str | None = None,
) -> None:
    """Attach CORSMiddleware using explicit origins and optional preview regex."""
    raw_origins = (
        cors_origins
        if cors_origins is not None
        else (os.getenv("CORS_ORIGINS") or os.getenv("FRONTEND_ORIGINS") or settings.CORS_ORIGINS)
    )
    if cors_origin_regex is not None:
        raw_regex = cors_origin_regex
    elif "CORS_ORIGIN_REGEX" in os.environ:
        raw_regex = os.environ["CORS_ORIGIN_REGEX"]
    else:
        raw_regex = settings.CORS_ORIGIN_REGEX

    application.add_middleware(
        CORSMiddleware,
        allow_origins=_parse_cors_origins(raw_origins),
        allow_origin_regex=_resolve_cors_origin_regex(raw_regex),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


configure_cors(app)

# ---------------------------------------------------------------------------
# Router (already prefixed with /api/v1)
# ---------------------------------------------------------------------------
app.include_router(api_router)


# ---------------------------------------------------------------------------
# Global exception handler — return consistent JSON error responses
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "INTERNAL_ERROR",
            "message": "An unexpected error occurred.",
        },
    )


# ---------------------------------------------------------------------------
# Root & Health endpoints
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"status": "ok", "app": "Sài Gòn Guide API", "version": "2.0.0"}


def _get_commit() -> str | None:
    commit = os.getenv("RENDER_GIT_COMMIT", "").strip()
    return commit or None


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Sài Gòn Guide API (FastAPI)",
        "database": "SQLite / PostgreSQL Ready (SQLAlchemy ORM)",
        "version": "2.0.0",
        "commit": _get_commit(),
    }


@app.get("/health/ready", tags=["Health"])
async def readiness_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        places_count = await db.scalar(select(func.count()).select_from(Place))
    except Exception as exc:
        logger.warning("Readiness check failed: %s", type(exc).__name__)
        try:
            await db.rollback()
        except Exception:
            pass
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "error": type(exc).__name__},
        )

    if not places_count or places_count <= 0:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "error": "empty_places_catalog"},
        )

    return {
        "status": "ready",
        "db": "ok",
        "places": int(places_count),
        "commit": _get_commit(),
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
