"""Version 1 API router."""

from fastapi import APIRouter

from app.api.v1.endpoints.ai import router as ai_router
from app.api.v1.endpoints.places import router as places_router


api_router = APIRouter()
api_router.include_router(ai_router)
api_router.include_router(places_router)
