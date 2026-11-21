"""
main.py — FastAPI Application Entrypoint.
Sài Gòn Guide — HCMC AI Travel Planner API
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.db.session import create_tables

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize database tables on startup (SQLite or PostgreSQL)
    try:
        await create_tables()
        logger.info("Database tables initialized successfully via SQLAlchemy ORM.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not auto-initialize DB tables on startup: %s", exc)
    yield


app = FastAPI(
    title="🧭 Sài Gòn Guide — AI Travel Planner API",
    description="Backend API hệ thống gợi ý lịch trình du lịch TP.HCM sử dụng FastAPI & Google Gemini API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration to allow Frontend (Vite port 5173 / production) requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix="/api/v1")


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
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
