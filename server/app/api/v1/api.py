"""
api.py — API v1 router combining all endpoint modules.
Authors : Đỗ Nguyễn An Khang (Auth & Trips), Ngô Tấn Đạt (Places), Đàng Minh Hạo (Calendar)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.api.v1.endpoints import auth, calendar, places, trips

logger = logging.getLogger(__name__)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(trips.router)
api_router.include_router(places.router)
api_router.include_router(calendar.router)

# Include AI router when available
try:
    from app.api.v1.endpoints import ai

    if hasattr(ai, "router"):
        api_router.include_router(ai.router)
except ImportError as err:
    logger.debug("ai router not loaded: %s", err)
