"""
places_service.py — Business logic for searching, filtering, and caching HCMC places.
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)

Key features:
  - 100% SQLAlchemy ORM (compatible with SQLite dev & PostgreSQL/Supabase prod).
  - Search places by keyword, district, category, indoor/outdoor.
  - Safe distance calculation with Haversine formula + numerical clamping [-1, 1].
  - 7-day TTL cache for external Google Places API responses (bảng places_cache).
  - Security: Google API key is never exposed to the client; photos served via proxy.
"""
from __future__ import annotations

import json
import logging
import math
import os
from datetime import timedelta
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import case, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Place, PlaceCache
from app.utils.time import utc_now

logger = logging.getLogger(__name__)

GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")
GOOGLE_PLACES_BASE_URL: str = "https://places.googleapis.com/v1"
CACHE_TTL_DAYS: int = 7


# ---------------------------------------------------------------------------
# Helper: Google Places API (New) with 7-day TTL DB cache
# ---------------------------------------------------------------------------
async def _fetch_google_place_details(
    db: AsyncSession | None,
    google_place_id: str,
) -> dict[str, Any] | None:
    """
    Fetches live Google Places details with a 7-day TTL database cache layer.

    Flow:
      1. Check `places_cache` table in DB: return cached data if fresh (cache HIT).
      2. If cache miss / expired: call Google Places API (New).
      3. If call succeeds: cache result in DB with 7-day TTL.
      4. If call fails or API key missing: fallback to expired cache if present, else None.
    """
    cache_entry: PlaceCache | None = None

    # Step 1: Check cache in database if session is provided
    if db is not None:
        try:
            stmt = select(PlaceCache).where(PlaceCache.place_id == google_place_id)
            res = await db.execute(stmt)
            cache_entry = res.scalar_one_or_none()
            if cache_entry and not cache_entry.is_expired():
                logger.info("Places cache HIT for %s", google_place_id)
                return cache_entry.to_data()
        except Exception as exc:
            logger.warning("Error reading places_cache for %s: %s", google_place_id, exc)

    # If no API key configured, return expired cache or None
    if not GOOGLE_PLACES_API_KEY:
        return cache_entry.to_data() if cache_entry else None

    # Step 2: Call Google Places API (New)
    url = f"{GOOGLE_PLACES_BASE_URL}/places/{google_place_id}"
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
                data = resp.json()
                # Step 3: Save or update cache in database
                if db is not None:
                    try:
                        now = utc_now()
                        if cache_entry:
                            cache_entry.data_json = json.dumps(data, ensure_ascii=False)
                            cache_entry.cached_at = now
                            cache_entry.expires_at = now + timedelta(days=CACHE_TTL_DAYS)
                        else:
                            new_entry = PlaceCache.create_entry(
                                place_id=google_place_id,
                                data=data,
                                ttl_days=CACHE_TTL_DAYS,
                            )
                            db.add(new_entry)
                        await db.commit()
                    except Exception as save_exc:
                        logger.warning(
                            "Error saving places_cache for %s: %s", google_place_id, save_exc
                        )
                return data
    except Exception as exc:
        logger.warning("Google Places API error for %s: %s", google_place_id, exc)

    # Step 4: Fallback to expired cache if available
    if cache_entry:
        return cache_entry.to_data()

    return None


# ---------------------------------------------------------------------------
# Core Service Functions (100% SQLAlchemy ORM)
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
    Search places with optional filters using SQLAlchemy ORM.
    Compatible with SQLite and PostgreSQL.

    Args:
        db       : async SQLAlchemy session.
        q        : free-text search on name, name_vi, address, tags, description.
        district : exact district filter (e.g. "Quận 1", "TP. Thủ Đức").
        category : attraction | food | cafe | culture | shopping | park | entertainment.
        is_indoor: True / False / None (all).
        limit    : pagination page size.
        offset   : pagination offset.

    Returns:
        List of place dicts ready to be serialised by FastAPI endpoints.
    """
    stmt = select(Place).where(Place.is_active == True)

    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Place.name.ilike(term),
                Place.name_vi.ilike(term),
                Place.address.ilike(term),
                Place.tags.ilike(term),
                Place.description.ilike(term),
            )
        )

    if district and district.strip():
        stmt = stmt.where(Place.district == district.strip())

    if category and category.strip():
        stmt = stmt.where(Place.category == category.strip().lower())

    if is_indoor is not None:
        stmt = stmt.where(Place.is_indoor == is_indoor)

    # Cross-database NULLS LAST ordering:
    # Places with rating appear first (sorted descending), nulls appear last.
    stmt = (
        stmt.order_by(
            case((Place.average_rating.is_(None), 1), else_=0),
            Place.average_rating.desc(),
            Place.name.asc(),
        )
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(stmt)
    places = result.scalars().all()
    return [p.to_dict() for p in places]


async def get_place_by_id(
    db: AsyncSession,
    place_id: str | UUID,
    *,
    enrich_from_google: bool = True,
) -> dict[str, Any] | None:
    """
    Fetch a single place by ID with optional Google Places API enrichment & 7-day TTL cache.

    Args:
        db                 : async SQLAlchemy session.
        place_id           : UUID / string ID of the place.
        enrich_from_google : when True, attempts Google Places API enrichment.

    Returns:
        Place dict or None if not found.
    """
    stmt = select(Place).where(Place.id == str(place_id), Place.is_active == True)
    result = await db.execute(stmt)
    place_obj = result.scalar_one_or_none()
    if not place_obj:
        return None

    place = place_obj.to_dict()

    # Live enrichment from Google Places (New) with 7-day DB cache
    if enrich_from_google and place.get("google_place_id"):
        google_data = await _fetch_google_place_details(db, place["google_place_id"])
        if google_data:
            live_rating = google_data.get("rating")
            if live_rating is not None:
                place["average_rating"] = float(live_rating)

            # [Security] Store only the backend proxy URL — never embed the Google API key!
            photos = google_data.get("photos", [])
            if photos and not place.get("photo_url"):
                photo_name = photos[0].get("name", "")
                if photo_name:
                    place["photo_url"] = f"/api/v1/places/photo?name={photo_name}"

    return place


# ---------------------------------------------------------------------------
# Distance calculation (Haversine with numerical clamping)
# ---------------------------------------------------------------------------
def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two points on the Earth (in km)
    using the Haversine formula with numerical clamping to prevent math domain errors.
    """
    R = 6371.0  # Earth's radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    # [Bug fix] Clamp 'a' to [0.0, 1.0] to prevent floating point inaccuracies
    # from causing math domain error in sqrt or atan2 when coords are identical or close.
    a = max(0.0, min(1.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


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
    Find places within a given radius (km) for the Swap Place feature.
    Uses a database bounding-box pre-filter + exact Haversine calculation in Python.
    100% compatible with both SQLite and PostgreSQL.

    Args:
        db         : async SQLAlchemy session.
        latitude   : center latitude.
        longitude  : center longitude.
        radius_km  : search radius in kilometres (default 2 km).
        category   : optional category filter.
        is_indoor  : optional indoor filter.
        limit      : max results.

    Returns:
        List of place dicts ordered by ascending distance, with 'distance_km'.
    """
    # 1 degree lat ~ 110.574 km; 1 degree lon ~ 111.320 * cos(lat) km
    lat_delta = (radius_km * 1.1) / 110.574
    cos_lat = math.cos(math.radians(latitude))
    lon_delta = (radius_km * 1.1) / (111.320 * max(0.01, abs(cos_lat)))

    stmt = select(Place).where(
        Place.is_active == True,
        Place.latitude.between(latitude - lat_delta, latitude + lat_delta),
        Place.longitude.between(longitude - lon_delta, longitude + lon_delta),
    )

    if category and category.strip():
        stmt = stmt.where(Place.category == category.strip().lower())

    if is_indoor is not None:
        stmt = stmt.where(Place.is_indoor == is_indoor)

    result = await db.execute(stmt)
    candidates = result.scalars().all()

    # Compute exact distance and filter within radius
    nearby: list[tuple[float, dict[str, Any]]] = []
    for p in candidates:
        dist = _haversine_distance_km(latitude, longitude, p.latitude, p.longitude)
        if dist <= radius_km:
            p_dict = p.to_dict()
            p_dict["distance_km"] = round(dist, 3)
            nearby.append((dist, p_dict))

    # Sort by distance ascending
    nearby.sort(key=lambda item: item[0])

    return [item[1] for item in nearby[:limit]]
