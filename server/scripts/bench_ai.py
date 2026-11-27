"""Benchmark GeminiService concept + itinerary generation directly on HCMC catalog."""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any

SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from app.db.hcmc_data import PLACES  # noqa: E402
from app.schemas.ai import (  # noqa: E402
    PlaceResponse,
    TripConceptRequest,
    TripGenerationRequest,
)
from app.services.gemini_service import GeminiService  # noqa: E402

_CATEGORY_MAP = {
    "attraction": "sightseeing",
    "culture": "sightseeing",
    "park": "nature",
}


def _to_place_response(place: dict[str, Any]) -> PlaceResponse:
    raw_category = str(place.get("category") or "sightseeing")
    category = _CATEGORY_MAP.get(raw_category, raw_category)
    rating = place.get("average_rating")
    opening = place.get("open_time")
    closing = place.get("close_time")
    opening_hours = (
        [f"{str(opening)[:5]} - {str(closing)[:5]}"]
        if opening is not None and closing is not None
        else []
    )
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
        opening_hours=opening_hours,
        suggested_duration=int(place.get("suggested_duration") or 60),
    )


def load_local_catalog() -> list[PlaceResponse]:
    active_rows = [row for row in PLACES if row.get("is_active", True)]
    active_rows.sort(
        key=lambda row: (
            row.get("average_rating") is None,
            -(float(row.get("average_rating") or 0.0)),
            str(row.get("name") or ""),
        )
    )
    return [
        place
        for place in (_to_place_response(row) for row in active_rows[:400])
        if place.editorial_score >= 4.0
    ]


async def main() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        pass
    else:
        load_dotenv(SERVER_DIR / ".env", override=False)

    # The service logs the actual prompt length, duration and source for both steps.
    logging.basicConfig(level=logging.WARNING, format="%(message)s", stream=sys.stdout)
    logging.getLogger(GeminiService.__module__).setLevel(logging.INFO)
    api_key = (os.environ.get("GEMINI_API_KEY") or "").strip() or None
    model = (os.environ.get("GEMINI_MODEL") or "gemini-3.5-flash").strip() or "gemini-3.5-flash"

    catalog = load_local_catalog()
    catalog_ids = {place.place_id for place in catalog}

    service = GeminiService(api_key=api_key, model=model)
    concept_req = TripConceptRequest(
        start_location="Quận 1, TP. Hồ Chí Minh",
        budget=3_000_000,
        days=2,
        districts=["Quận 1"],
        places_per_day=4,
        companion="friends",
        member_count=3,
        transport_mode="grab_bike",
        preferences=["food", "culture"],
        pace="moderate",
        special_notes="",
    )

    print(
        f"Catalog loaded: {len(catalog)} places (score >= 4.0) | "
        f"model={model} | api_key_configured={bool(api_key)}"
    )

    concept = await service.suggest_concept(concept_req, catalog)

    gen_req = TripGenerationRequest(
        **concept_req.model_dump(),
        approved_concept=concept,
    )

    itinerary = await service.generate_itinerary(gen_req, catalog)
    items = itinerary.itinerary_items
    unknown_ids = [item.place_id for item in items if item.place_id not in catalog_ids]
    all_in_catalog = not unknown_ids
    print(f"stops={len(items)} all_place_ids_in_catalog={all_in_catalog}")
    if len(items) != gen_req.days * gen_req.places_per_day:
        raise SystemExit("Unexpected number of itinerary stops.")
    if not all_in_catalog:
        raise SystemExit(f"Found place_ids outside catalog: {unknown_ids}")


if __name__ == "__main__":
    asyncio.run(main())
