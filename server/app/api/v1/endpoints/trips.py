"""
trips.py — CRUD endpoints for trips (create, list, detail, update, delete, clone, share).
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""
from __future__ import annotations

import json
import re
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import TripOwner, get_current_user, get_owner
from app.db.models import Trip, User
from app.db.session import get_db
from app.schemas.trip import (
    BudgetSummary,
    CloneResponse,
    ShareResponse,
    TripCreate,
    TripDetailOut,
    TripItemUpdate,
    TripListOut,
    TripOut,
    TripUpdate,
)
from app.utils.time import utc_now

router = APIRouter(prefix="/trips", tags=["trips"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _parse_items(trip: Trip) -> list[dict]:
    try:
        return json.loads(trip.itinerary_json) if trip.itinerary_json else []
    except (json.JSONDecodeError, TypeError):
        return []


def _parse_prefs(trip: Trip) -> list[str]:
    try:
        return json.loads(trip.preferences) if trip.preferences else []
    except (json.JSONDecodeError, TypeError):
        return []


def _public_items(items: list[dict]) -> list[dict]:
    """Remove account, check-in, expense, and other private data recursively."""
    private_fragments = (
        "user", "session", "email", "phone", "checkin", "cost", "budget",
        "expense", "private",
    )

    def clean(value):
        if isinstance(value, dict):
            return {
                key: clean(item)
                for key, item in value.items()
                if key.lower() not in {"note", "notes"}
                and not any(fragment in key.lower() for fragment in private_fragments)
            }
        if isinstance(value, list):
            return [clean(item) for item in value]
        return value

    return [clean(item) for item in items]


def _compute_budget(trip: Trip, items: list[dict]) -> BudgetSummary:
    member_count = trip.member_count or 1
    activities_unit = sum(int(it.get("estimated_cost", 0) or 0) for it in items)
    activities_total = activities_unit * member_count

    transit_total = 0
    for it in items:
        ti = it.get("transit_info")
        if ti:
            fare = int(ti.get("estimated_fare_vnd", 0) or 0)
            mode = ti.get("mode", "")
            if mode == "grab_bike":
                transit_total += fare * member_count
            else:
                transit_total += fare
    transit_total += len(items) * 5000

    total = activities_total + transit_total
    target = trip.budget or 0
    pct = round((total / target) * 100) if target else 0
    health = (
        "over_budget"
        if total > target
        else ("near_budget" if total > target * 0.85 else "under_budget")
    )

    return BudgetSummary(
        total_budget=target,
        total_estimated=total,
        activities_cost=activities_total,
        transit_cost=transit_total,
        member_count=member_count,
        per_person_estimated=round(total / member_count) if member_count else total,
        percentage=pct,
        health=health,
    )


def _trip_out(trip: Trip, items: list[dict] | None = None) -> TripOut:
    if items is None:
        items = _parse_items(trip)
    return TripOut(
        id=trip.id,
        title=trip.title,
        days=trip.days,
        budget=trip.budget,
        total_estimated=trip.total_estimated,
        place_count=trip.place_count,
        status=trip.status,
        created_at=trip.created_at,
        is_shared=trip.share_token is not None,
        cover_photo=trip.cover_photo,
        cover_place_name=trip.cover_place_name,
        places_per_day=trip.places_per_day,
        companion=trip.companion,
        member_count=trip.member_count,
        transport_mode=trip.transport_mode,
        start_time=trip.start_time,
        end_time=trip.end_time,
        start_location=trip.start_location,
        preferences=_parse_prefs(trip),
        special_notes=trip.special_notes,
        source="saved",
    )


def _demo_trip_response() -> TripDetailOut:
    """Build the read-only itinerary used by the public /trip/demo page."""
    places = [
        ("Nhà thờ Đức Bà Sài Gòn", "culture", "Quận 1", 10.7797, 106.6990, 0, False),
        ("Bưu điện Trung tâm Sài Gòn", "culture", "Quận 1", 10.7798, 106.6993, 0, True),
        ("Dinh Độc Lập", "culture", "Quận 1", 10.7769, 106.6956, 40000, True),
        ("Cơm Tấm Ba Ghiền", "food", "Phú Nhuận", 10.7925, 106.6710, 55000, True),
        ("Bảo tàng Mỹ thuật TP.HCM", "culture", "Quận 1", 10.7698, 106.6995, 30000, True),
        ("Chợ Bến Thành", "shopping", "Quận 1", 10.7726, 106.6982, 0, True),
        ("Phố đi bộ Nguyễn Huệ", "sightseeing", "Quận 1", 10.7741, 106.7030, 0, False),
        ("Cơm Niêu Sài Gòn", "food", "Quận 1", 10.7765, 106.6980, 95000, True),
        ("Bảo tàng Chứng tích Chiến tranh", "culture", "Quận 3", 10.7794, 106.6927, 40000, True),
        ("Hồ Con Rùa", "sightseeing", "Quận 3", 10.7821, 106.6965, 0, False),
        ("Quán Bụi — Hương Vị Đồng Quê", "food", "Quận 1", 10.7810, 106.7040, 90000, True),
        ("Công viên Tao Đàn", "park", "Quận 1", 10.7747, 106.6920, 0, False),
    ]
    time_slots = (("08:00", "09:30"), ("10:00", "11:30"), ("12:00", "13:30"), ("15:00", "16:30"))
    items: list[dict] = []
    for index, (name, category, district, latitude, longitude, cost, indoor) in enumerate(places):
        day_number, order_index = divmod(index, 4)
        start_time, end_time = time_slots[order_index]
        transit = None if order_index == 0 else {
            "duration_min": 15,
            "distance_km": 1.2,
            "mode": "walk" if order_index == 1 else "grab_bike",
            "estimated_fare_vnd": 0 if order_index == 1 else 18000,
            "start_time": time_slots[order_index - 1][1],
            "end_time": start_time,
        }
        items.append({
            "place_id": f"demo-{index + 1}",
            "place_name": name,
            "category": category,
            "description": f"Điểm tham quan tiêu biểu tại {district}, TP. Hồ Chí Minh.",
            "address": f"{district}, TP. Hồ Chí Minh",
            "district": district,
            "latitude": latitude,
            "longitude": longitude,
            "estimated_cost": cost,
            "editorial_score": 4.6,
            "is_indoor": indoor,
            "day_number": day_number + 1,
            "order_index": order_index + 1,
            "time_slot": f"{start_time} - {end_time}",
            "start_time": start_time,
            "end_time": end_time,
            "is_lunch": order_index == 2,
            "transit_info": transit,
            "visited": False,
            "is_accepted": True,
        })

    trip = TripOut(
        id="demo",
        title="Khám phá Sài Gòn 3 ngày",
        days=3,
        budget=5_000_000,
        total_estimated=sum(item["estimated_cost"] for item in items) * 4,
        place_count=len(items),
        status="completed",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        is_shared=False,
        places_per_day=4,
        companion="group",
        member_count=4,
        transport_mode="grab_bike",
        start_location="Quận 1, TP. Hồ Chí Minh",
        preferences=["food", "culture"],
        source="demo",
    )
    return TripDetailOut(
        trip=trip,
        itinerary_items=items,
        budget_summary=_compute_budget(trip, items),
    )


def _owner_filter(owner: TripOwner):
    if owner.user is not None:
        return Trip.user_id == owner.user.id
    return and_(Trip.user_id.is_(None), Trip.session_id == owner.session_id)


def _owner_fields(owner: TripOwner) -> dict:
    if owner.user is not None:
        return {"user_id": owner.user.id, "session_id": None}
    return {"user_id": None, "session_id": owner.session_id}


async def _enforce_guest_trip_limit(owner: TripOwner, db: AsyncSession) -> None:
    if owner.session_id is None:
        return
    guest_trip_count = await db.scalar(
        select(func.count()).select_from(Trip).where(_owner_filter(owner))
    )
    if guest_trip_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="TRIP_SESSION_LIMIT_REACHED",
        )


async def _get_owned_trip(trip_id: str, owner: TripOwner, db: AsyncSession) -> Trip:
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id, _owner_filter(owner))
    )
    trip = result.scalar_one_or_none()
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOT_FOUND")
    return trip


async def _next_clone_title(source_title: str, owner: TripOwner, db: AsyncSession) -> str:
    """Return the first available numbered copy title, e.g. ``Trip (1)``."""
    base_title = source_title.strip()
    base_title = re.sub(r"(?:\s*\(bản sao\))+$", "", base_title, flags=re.IGNORECASE).rstrip()
    match = re.fullmatch(r"(.*?)\s*\((\d+)\)", base_title)
    if match:
        base_title = match.group(1).rstrip()
    result = await db.execute(select(Trip.title).where(_owner_filter(owner)))
    existing = set(result.scalars().all())
    number = 1
    while f"{base_title} ({number})" in existing:
        number += 1
    return f"{base_title} ({number})"


# ---------------------------------------------------------------------------
# POST / — Create a new trip
# ---------------------------------------------------------------------------
@router.post("/", response_model=TripOut, status_code=status.HTTP_201_CREATED)
async def create_trip(
    payload: TripCreate,
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    await _enforce_guest_trip_limit(owner, db)

    items = payload.itinerary_items or []
    cover_photo = items[0].get("photo_url") if items else None
    cover_place_name = items[0].get("place_name") if items else None

    trip = Trip(
        **_owner_fields(owner),
        title=payload.title,
        days=payload.days,
        budget=payload.budget or 5000000,
        places_per_day=payload.places_per_day,
        companion=payload.companion,
        member_count=payload.member_count,
        transport_mode=payload.transport_mode,
        start_time=payload.start_time,
        end_time=payload.end_time,
        start_location=payload.start_location,
        preferences=json.dumps(payload.preferences),
        special_notes=payload.special_notes,
        status="completed",
        itinerary_json=json.dumps(items),
        place_count=len(items),
        cover_photo=cover_photo,
        cover_place_name=cover_place_name,
    )

    # Compute budget
    db.add(trip)
    await db.flush()
    await db.refresh(trip)

    budget = _compute_budget(trip, items)
    trip.total_estimated = budget.total_estimated
    await db.flush()
    await db.refresh(trip)

    return _trip_out(trip, items)


# ---------------------------------------------------------------------------
# GET /me — List user's trips
# ---------------------------------------------------------------------------
@router.get("/me", response_model=TripListOut)
async def list_my_trips(
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip)
        .where(_owner_filter(owner))
        .order_by(Trip.created_at.desc())
    )
    trips = result.scalars().all()
    return TripListOut(trips=[_trip_out(t) for t in trips])


# ---------------------------------------------------------------------------
# GET /{trip_id} — Trip detail
# ---------------------------------------------------------------------------
@router.get("/demo", response_model=TripDetailOut)
async def get_demo_trip():
    """Public, read-only demo itinerary; no user or database row is required."""
    return _demo_trip_response()


@router.get("/{trip_id}", response_model=TripDetailOut)
async def get_trip(
    trip_id: str,
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_owned_trip(trip_id, owner, db)
    items = _parse_items(trip)
    budget = _compute_budget(trip, items)

    trip_data = _trip_out(trip, items)
    # Add extra fields the frontend expects
    trip_dict = trip_data.model_dump()

    return TripDetailOut(
        trip=TripOut(**trip_dict),
        itinerary_items=items,
        budget_summary=budget,
    )


# ---------------------------------------------------------------------------
# PUT /{trip_id} — Update trip
# ---------------------------------------------------------------------------
@router.put("/{trip_id}", response_model=TripOut)
async def update_trip(
    trip_id: str,
    payload: TripUpdate,
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_owned_trip(trip_id, owner, db)
    if payload.title is not None:
        trip.title = payload.title
    if payload.status is not None:
        trip.status = payload.status
    if payload.itinerary_items is not None:
        trip.itinerary_json = json.dumps(payload.itinerary_items)
        trip.place_count = len(payload.itinerary_items)
        if payload.itinerary_items:
            trip.cover_photo = payload.itinerary_items[0].get("photo_url") or trip.cover_photo
            trip.cover_place_name = (
                payload.itinerary_items[0].get("place_name") or trip.cover_place_name
            )
        trip.total_estimated = _compute_budget(trip, payload.itinerary_items).total_estimated
    trip.updated_at = utc_now()
    await db.flush()
    await db.refresh(trip)
    return _trip_out(trip)


@router.patch("/{trip_id}/items/{day_number}/{order_index}")
async def update_trip_item(
    trip_id: str,
    day_number: int,
    order_index: int,
    payload: TripItemUpdate,
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    """Persist a stop's visited state and check-in note/photo."""
    trip = await _get_owned_trip(trip_id, owner, db)
    items = _parse_items(trip)
    item = next(
        (value for value in items
         if value.get("day_number") == day_number
         and value.get("order_index") == order_index),
        None,
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TRIP_ITEM_NOT_FOUND")

    updates = payload.model_dump(exclude_unset=True)
    if "visited" in updates:
        item["visited"] = updates["visited"]
    if "is_accepted" in updates:
        item["is_accepted"] = updates["is_accepted"]
    if "photo_url" in updates:
        if updates["photo_url"] is not None:
            item["checkin_photo"] = updates["photo_url"]
        else:
            item.pop("checkin_photo", None)
    if "note" in updates:
        if updates["note"] is not None:
            item["checkin_note"] = updates["note"]
        else:
            item.pop("checkin_note", None)
    if updates.get("visited") or updates.get("photo_url") or updates.get("note"):
        item["checkin_time"] = datetime.now(timezone.utc).isoformat()

    trip.itinerary_json = json.dumps(items)
    trip.updated_at = utc_now()
    await db.flush()
    return {"items": items}


# ---------------------------------------------------------------------------
# DELETE /{trip_id}
# ---------------------------------------------------------------------------
@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: str,
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_owned_trip(trip_id, owner, db)
    await db.delete(trip)
    return {"success": True}


# ---------------------------------------------------------------------------
# POST /{trip_id}/clone — Duplicate trip
# ---------------------------------------------------------------------------
@router.post("/{trip_id}/clone", response_model=CloneResponse)
async def clone_trip(
    trip_id: str,
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    source = await _get_owned_trip(trip_id, owner, db)
    await _enforce_guest_trip_limit(owner, db)
    new_trip = Trip(
        **_owner_fields(owner),
        title=await _next_clone_title(source.title, owner, db),
        days=source.days,
        budget=source.budget,
        total_estimated=source.total_estimated,
        place_count=source.place_count,
        places_per_day=source.places_per_day,
        companion=source.companion,
        member_count=source.member_count,
        transport_mode=source.transport_mode,
        start_time=source.start_time,
        end_time=source.end_time,
        start_location=source.start_location,
        preferences=source.preferences,
        special_notes=source.special_notes,
        status="completed",
        itinerary_json=source.itinerary_json,
        cover_photo=source.cover_photo,
        cover_place_name=source.cover_place_name,
    )
    db.add(new_trip)
    await db.flush()
    await db.refresh(new_trip)
    return CloneResponse(id=new_trip.id, trip=_trip_out(new_trip))


# ---------------------------------------------------------------------------
# POST /{trip_id}/share — Generate share link
# ---------------------------------------------------------------------------
@router.post("/{trip_id}/share", response_model=ShareResponse)
async def create_share_link(
    trip_id: str,
    request: Request,
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_owned_trip(trip_id, owner, db)
    if not trip.share_token:
        trip.share_token = secrets.token_urlsafe(16)
        trip.updated_at = utc_now()
        await db.flush()
        await db.refresh(trip)

    # Share URL points to frontend
    share_url = f"{request.headers.get('origin', 'http://localhost:5173')}/s/{trip.share_token}"
    return ShareResponse(token=trip.share_token, share_url=share_url)


# ---------------------------------------------------------------------------
# DELETE /{trip_id}/share — Revoke share link
# ---------------------------------------------------------------------------
@router.delete("/{trip_id}/share")
async def revoke_share_link(
    trip_id: str,
    owner: TripOwner = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_owned_trip(trip_id, owner, db)
    trip.share_token = None
    trip.updated_at = utc_now()
    return {"success": True}


# ---------------------------------------------------------------------------
# GET /shared/{token} — Public shared trip (no auth required)
# ---------------------------------------------------------------------------
@router.get("/shared/{token}", response_model=TripDetailOut)
async def get_shared_trip(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trip).where(Trip.share_token == token))
    trip = result.scalar_one_or_none()
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SHARE_TOKEN_INVALID")

    items = _parse_items(trip)
    public_items = _public_items(items)

    # Do not expose budget or other account details on the public page.
    trip_data = _trip_out(trip, public_items).model_copy(update={
        "budget": 0,
        "total_estimated": 0,
        "place_count": len(public_items),
        "special_notes": None,
    })

    return TripDetailOut(
        trip=trip_data,
        itinerary_items=public_items,
        budget_summary=BudgetSummary(),
    )


# ---------------------------------------------------------------------------
# POST /shared/{token}/clone — Clone shared trip (requires auth)
# ---------------------------------------------------------------------------
@router.post("/shared/{token}/clone", response_model=CloneResponse)
async def clone_shared_trip(
    token: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.share_token == token))
    source = result.scalar_one_or_none()
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SHARE_TOKEN_INVALID")

    owner = TripOwner(user=user)
    new_trip = Trip(
        **_owner_fields(owner),
        title=await _next_clone_title(source.title, owner, db),
        days=source.days,
        budget=source.budget,
        total_estimated=source.total_estimated,
        place_count=source.place_count,
        places_per_day=source.places_per_day,
        companion=source.companion,
        member_count=source.member_count,
        transport_mode=source.transport_mode,
        start_time=source.start_time,
        end_time=source.end_time,
        start_location=source.start_location,
        preferences=source.preferences,
        special_notes=source.special_notes,
        status="completed",
        itinerary_json=json.dumps(_public_items(_parse_items(source))),
        cover_photo=source.cover_photo,
        cover_place_name=source.cover_place_name,
    )
    db.add(new_trip)
    await db.flush()
    await db.refresh(new_trip)
    return CloneResponse(id=new_trip.id, trip=_trip_out(new_trip))
