"""
main.py — FastAPI application entry point.
Authors : Đỗ Nguyễn An Khang (Backend Lead & Auth Service), Ngô Tấn Đạt (Places)
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.db.session import create_tables, engine

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — auto-initialize ORM tables on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await create_tables()
        logger.info("Database tables initialized successfully via SQLAlchemy ORM.")
    except Exception as exc:
        logger.warning("Could not auto-initialize DB tables on startup: %s", exc)
    yield
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
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
