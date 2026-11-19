"""
api.py — Central API router aggregation for v1 endpoints.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import places

api_router = APIRouter()
api_router.include_router(places.router)
