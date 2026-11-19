"""REST endpoints for AI trip concepts, itinerary generation, and Smart Swap."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.ai import (
    ConceptResponse,
    PlaceResponse,
    SmartSwapRequest,
    SmartSwapResponse,
    TripConceptRequest,
    TripGenerationRequest,
    TripGenerationResponse,
)
from app.services.gemini_service import GeminiService, GeminiServiceError
from app.services.places_service import search_places


router = APIRouter(prefix="/ai", tags=["AI"])
DBSession = Annotated[AsyncSession, Depends(get_db)]

_CATEGORY_MAP = {
    "attraction": "sightseeing",
    "culture": "sightseeing",
    "park": "nature",
}


def _format_opening_hours(place: dict[str, Any]) -> list[str]:
    opening = place.get("open_time")
    closing = place.get("close_time")
    if opening is None or closing is None:
        return []
    return [f"{str(opening)[:5]} - {str(closing)[:5]}"]


def _to_place_response(place: dict[str, Any]) -> PlaceResponse:
    """Translate the Places database shape into the itinerary UI shape."""
    raw_category = str(place.get("category") or "sightseeing")
    category = _CATEGORY_MAP.get(raw_category, raw_category)
    rating = place.get("average_rating")
    return PlaceResponse(
        place_id=str(place.get("id") or place.get("place_id") or ""),
        place_name=str(place.get("name_vi") or place.get("name") or ""),
        category=category,
        description=str(place.get("description") or ""),
        address=str(place.get("address") or ""),
        district=str(place.get("district") or ""),
        latitude=float(place.get("latitude") or 0),
        longitude=float(place.get("longitude") or 0),
        estimated_cost=int(place.get("entry_fee_vnd") or place.get("estimated_cost") or 0),
        photo_url=str(place.get("photo_url") or ""),
        editorial_score=float(rating) if rating is not None else 0.0,
        is_indoor=bool(place.get("is_indoor", False)),
        opening_hours=_format_opening_hours(place),
        suggested_duration=int(place.get("suggested_duration") or 60),
    )


def _get_service(request: Request) -> GeminiService:
    service = getattr(request.app.state, "gemini_service", None)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured.",
        )
    return service


async def _load_catalog(
    db: AsyncSession,
    *,
    district: str | None = None,
) -> list[PlaceResponse]:
    rows = await search_places(db, district=district, limit=100)
    places = [
        normalized
        for normalized in (_to_place_response(row) for row in rows)
        if normalized.editorial_score >= 4.0
    ]
    if not places:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No verified places are available for AI planning.",
        )
    return places


def _service_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="AI could not create a result from the available place catalog.",
    )


@router.post("/concept", response_model=ConceptResponse, summary="Đề xuất concept chuyến đi")
async def suggest_trip_concept(
    payload: TripConceptRequest,
    db: DBSession,
    request: Request,
) -> ConceptResponse:
    service = _get_service(request)
    places = await _load_catalog(db)
    try:
        return await service.suggest_concept(payload, places)
    except GeminiServiceError as error:
        raise _service_unavailable() from error


@router.post("/generate", response_model=TripGenerationResponse, summary="Tạo lịch trình chi tiết")
async def generate_trip_itinerary(
    payload: TripGenerationRequest,
    db: DBSession,
    request: Request,
) -> TripGenerationResponse:
    service = _get_service(request)
    places = await _load_catalog(db)
    try:
        return await service.generate_itinerary(payload, places)
    except GeminiServiceError as error:
        raise _service_unavailable() from error


@router.post("/swap", response_model=SmartSwapResponse, summary="Gợi ý địa điểm thay thế")
async def suggest_place_swaps(
    payload: SmartSwapRequest,
    db: DBSession,
    request: Request,
) -> SmartSwapResponse:
    service = _get_service(request)
    places = await _load_catalog(db, district=payload.current_item.district)
    try:
        return await service.suggest_swaps(payload, places)
    except GeminiServiceError as error:
        raise _service_unavailable() from error
