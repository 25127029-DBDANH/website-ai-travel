"""FastAPI application entry point for Sài Gòn Guide."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

load_dotenv()

# Import database and API modules only after loading local environment settings.
from app.api.v1.api import api_router  # noqa: E402
from app.db.models import Place  # noqa: E402
from app.db.session import AsyncSessionLocal, create_tables  # noqa: E402
from app.services.gemini_service import GeminiService  # noqa: E402

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    application.state.gemini_service = GeminiService(
        api_key=os.getenv("GEMINI_API_KEY"),
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
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


app = FastAPI(
    title="Sài Gòn Guide API",
    description="AI travel planning API for Ho Chi Minh City.",
    version="2.0.0",
    lifespan=lifespan,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
