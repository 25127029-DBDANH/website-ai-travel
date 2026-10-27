from fastapi import APIRouter
from app.api.v1.endpoints import auth, trips, ai, places, calendar

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(trips.router, prefix="/trips", tags=["Trips"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Planner"])
api_router.include_router(places.router, prefix="/places", tags=["Places & Map"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Google Calendar"])
