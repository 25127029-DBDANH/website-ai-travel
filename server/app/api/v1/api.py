"""
api.py — API v1 router combining all endpoint modules.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

api_router = APIRouter(prefix="/api/v1")

# Include calendar router
try:
    from app.api.v1.endpoints import calendar

    if hasattr(calendar, "router"):
        api_router.include_router(calendar.router)
except ImportError as err:
    logger.debug("calendar router not loaded: %s", err)

# Include other team members' routers if available
try:
    from app.api.v1.endpoints import auth

    if hasattr(auth, "router"):
        api_router.include_router(auth.router)
except ImportError as err:
    logger.debug("auth router not loaded: %s", err)

try:
    from app.api.v1.endpoints import trips

    if hasattr(trips, "router"):
        api_router.include_router(trips.router)
except ImportError as err:
    logger.debug("trips router not loaded: %s", err)

try:
    from app.api.v1.endpoints import places

    if hasattr(places, "router"):
        api_router.include_router(places.router)
except ImportError as err:
    logger.debug("places router not loaded: %s", err)

try:
    from app.api.v1.endpoints import ai

    if hasattr(ai, "router"):
        api_router.include_router(ai.router)
except ImportError as err:
    logger.debug("ai router not loaded: %s", err)
