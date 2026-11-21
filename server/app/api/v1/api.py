"""
api.py — API v1 router combining all endpoint modules.
Authors : Đỗ Nguyễn An Khang (Auth & Trips), Ngô Tấn Đạt (Places), Lê Hữu Lam (Gemini AI)
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import ai, auth, places, trips

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(trips.router)
api_router.include_router(places.router)
api_router.include_router(ai.router)

# Include other team members' routers when available
try:
    from app.api.v1.endpoints import calendar
    api_router.include_router(calendar.router)
except (ImportError, Exception):
    pass
