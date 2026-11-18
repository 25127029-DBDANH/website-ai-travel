"""
api.py — API v1 router combining all endpoint modules.
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, trips

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(trips.router)

# Include other team members' routers when available
try:
    from app.api.v1.endpoints import ai
    api_router.include_router(ai.router)
except (ImportError, Exception):
    pass

try:
    from app.api.v1.endpoints import places
    api_router.include_router(places.router)
except (ImportError, Exception):
    pass

try:
    from app.api.v1.endpoints import calendar
    api_router.include_router(calendar.router)
except (ImportError, Exception):
    pass
