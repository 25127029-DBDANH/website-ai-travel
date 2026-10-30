"""
places_service.py — Business logic for searching and fetching HCMC places.
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)

Responsibilities:
- Search places by district / category / keyword with Postgres full-text.
- Enrich place details with real-time Google Places API (New) data.
- Fallback to local DB when Google Places API is unavailable.
"""
from __future__ import annotations

import logging
import os
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")
GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1"

# ---------------------------------------------------------------------------
# Helper: Google Places API (New) — single place lookup by place_id
# ---------------------------------------------------------------------------
async def _fetch_google_place_details(place_id: str) -> dict[str, Any] | None:
    """
    Calls Google Places API (New) to fetch live rating, photos, and hours.
    Returns None on failure (triggers local-data fallback).
    """
    if not GOOGLE_PLACES_API_KEY:
        return None

    url = f"{GOOGLE_PLACES_BASE_URL}/places/{place_id}"
    headers = {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": (
            "id,displayName,rating,userRatingCount,"
            "currentOpeningHours,photos,priceLevel"
        ),
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.warning("Google Places API error for %s: %s", place_id, exc)
    return None


# ---------------------------------------------------------------------------
# Core service functions
# ---------------------------------------------------------------------------

async def search_places(
    db: AsyncSession,
    *,
    q: str | None = None,
    district: str | None = None,
    category: str | None = None,
    is_indoor: bool | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """
    Search places with optional filters.  Supports partial name match via pg_trgm.

    Args:
        db       : async SQLAlchemy session.
        q        : free-text search on place name (Vietnamese or English).
        district : exact district filter (e.g. "Quận 1", "Thủ Đức").
        category : one of attraction | food | culture | shopping | park | entertainment.
        is_indoor: True / False / None (all).
        limit    : pagination page size.
        offset   : pagination offset.

    Returns:
        List of place dicts ready to be serialised by Pydantic schemas.
    """
    filters: list[str] = ["is_active = TRUE"]
    params: dict[str, Any] = {"limit": limit, "offset": offset}

    if q:
        # Trigram similarity search — works with or without full pg_trgm extension
        filters.append(
            "(name ILIKE :q OR name_vi ILIKE :q OR address ILIKE :q OR :q_plain = ANY(tags))"
        )
        params["q"] = f"%{q}%"
        params["q_plain"] = q

    if district:
        filters.append("district = :district")
        params["district"] = district

    if category:
        filters.append("category = :category")
        params["category"] = category

    if is_indoor is not None:
        filters.append("is_indoor = :is_indoor")
        params["is_indoor"] = is_indoor

    where = " AND ".join(filters)
    sql = text(
        f"""
        SELECT
            id, name, name_vi, address, district,
            latitude, longitude, category, is_indoor,
            open_time, close_time, entry_fee_vnd,
            average_rating, photo_url, description, tags
        FROM places
        WHERE {where}
        ORDER BY average_rating DESC NULLS LAST, name
        LIMIT :limit OFFSET :offset
        """
    )
    result = await db.execute(sql, params)
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]


async def get_place_by_id(
    db: AsyncSession,
    place_id: str | UUID,
    *,
    enrich_from_google: bool = True,
) -> dict[str, Any] | None:
    """
    Fetch a single place by UUID.  Optionally enriches with live Google data.

    Args:
        db                 : async SQLAlchemy session.
        place_id           : UUID of the place.
        enrich_from_google : when True, attempts Google Places API enrichment.

    Returns:
        Place dict or None if not found.
    """
    sql = text(
        """
        SELECT
            id, name, name_vi, address, district,
            latitude, longitude, category, is_indoor,
            open_time, close_time, open_days, entry_fee_vnd,
            average_rating, google_place_id, photo_url, description, tags
        FROM places
        WHERE id = :place_id AND is_active = TRUE
        """
    )
    result = await db.execute(sql, {"place_id": str(place_id)})
    row = result.fetchone()
    if not row:
        return None

    place = dict(row._mapping)

    # Live enrichment from Google Places (New) ─────────────────────────────
    if enrich_from_google and place.get("google_place_id"):
        google_data = await _fetch_google_place_details(place["google_place_id"])
        if google_data:
            # Override rating with live value if better
            live_rating = google_data.get("rating")
            if live_rating:
                place["average_rating"] = live_rating
            # Use first photo reference if available
            photos = google_data.get("photos", [])
            if photos and not place.get("photo_url"):
                photo_name = photos[0].get("name", "")
                if photo_name and GOOGLE_PLACES_API_KEY:
                    place["photo_url"] = (
                        f"{GOOGLE_PLACES_BASE_URL}/{photo_name}/media"
                        f"?key={GOOGLE_PLACES_API_KEY}&maxWidthPx=800"
                    )

    return place


async def get_nearby_places(
    db: AsyncSession,
    *,
    latitude: float,
    longitude: float,
    radius_km: float = 2.0,
    category: str | None = None,
    is_indoor: bool | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """
    Find places within a given radius using the Haversine approximation in SQL.
    Useful for Swap Place feature (finding alternatives within 2 km).

    Args:
        db         : async SQLAlchemy session.
        latitude   : center latitude.
        longitude  : center longitude.
        radius_km  : search radius in kilometres (default 2 km).
        category   : optional category filter.
        is_indoor  : optional indoor filter.
        limit      : max results.

    Returns:
        List of place dicts ordered by ascending distance.
    """
    filters = ["is_active = TRUE"]
    params: dict[str, Any] = {
        "lat": latitude,
        "lng": longitude,
        "radius_km": radius_km,
        "limit": limit,
    }

    if category:
        filters.append("category = :category")
        params["category"] = category

    if is_indoor is not None:
        filters.append("is_indoor = :is_indoor")
        params["is_indoor"] = is_indoor

    where = " AND ".join(filters)

    # Haversine formula in Postgres
    sql = text(
        f"""
        SELECT
            id, name, name_vi, address, district,
            latitude, longitude, category, is_indoor,
            open_time, close_time, entry_fee_vnd,
            average_rating, photo_url, description, tags,
            (
                6371 * acos(
                    cos(radians(:lat)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(:lng)) +
                    sin(radians(:lat)) * sin(radians(latitude))
                )
            ) AS distance_km
        FROM places
        WHERE {where}
            AND (
                6371 * acos(
                    cos(radians(:lat)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(:lng)) +
                    sin(radians(:lat)) * sin(radians(latitude))
                )
            ) <= :radius_km
        ORDER BY distance_km ASC
        LIMIT :limit
        """
    )
    result = await db.execute(sql, params)
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]
