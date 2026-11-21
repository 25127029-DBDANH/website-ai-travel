"""
main.py — FastAPI application entry point for Sài Gòn Guide.
Authors : Đỗ Nguyễn An Khang (Auth & Trips), Ngô Tấn Đạt (Places), Lê Hữu Lam (Gemini AI)
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select

load_dotenv()

from app.api.v1.api import api_router  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.db.models import Place  # noqa: E402
from app.db.session import AsyncSessionLocal, create_tables, engine  # noqa: E402
from app.services.gemini_service import GeminiService  # noqa: E402

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — initialize Gemini service, ORM tables, and 327 HCMC places seed
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    application.state.gemini_service = GeminiService(
        api_key=os.getenv("GEMINI_API_KEY"),
        model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
    )
    try:
        await create_tables()
        async with AsyncSessionLocal() as session:
            place_count = await session.scalar(select(func.count()).select_from(Place))
        if not place_count:
            from app.db.hcmc_data import seed_places

            await seed_places()
            logger.info("Seeded the local HCMC place catalog.")
        else:
            logger.info("Using existing place catalog (%s places).", place_count)
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
_cors_raw = os.getenv("CORS_ORIGINS") or os.getenv("FRONTEND_ORIGINS") or settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in _cors_raw.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        content={"detail": "INTERNAL_ERROR", "message": "An unexpected error occurred."},
    )


# ---------------------------------------------------------------------------
# Root & Health endpoints
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"status": "ok", "app": "Sài Gòn Guide API", "version": "2.0.0"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Sài Gòn Guide API (FastAPI)",
        "database": "SQLite / PostgreSQL Ready (SQLAlchemy ORM)",
        "version": "2.0.0",
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
