"""
transit.py — API endpoints for multi-provider fare estimation and adaptive contingency.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

from datetime import time
from typing import Annotated, Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Place
from app.db.session import get_db
from app.schemas.transit import (
    ProviderEstimate,
    ReplacedStopInfo,
    TransitAdaptRequest,
    TransitAdaptResponse,
    TransitEstimateRequest,
    TransitEstimateResponse,
)
from app.services.contingency_service import (
    RUSH_HOUR_BUFFER_MINUTES,
    adapt_transit_info,
    get_rain_transport_modes,
    is_rush_hour,
)
from app.utils.transit_calculator import (
    VehicleFare,
    calculate_transit,
    estimate_ride_fares,
    haversine_km,
)

router = APIRouter(prefix="/transit", tags=["Transit & Adaptive"])

DBSession = Annotated[AsyncSession, Depends(get_db)]

_PROVIDER_META: tuple[tuple[str, str], ...] = (
    ("grab", "Grab"),
    ("xanhsm", "Xanh SM"),
    ("be", "Be"),
)


def _parse_time_str(value: str | None) -> time | None:
    if not value:
        return None
    parts = value.split(":")
    try:
        hour, minute = int(parts[0]), int(parts[1])
        return time(hour, minute)
    except (ValueError, IndexError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Định dạng giờ không hợp lệ (HH:MM): {value}",
        ) from exc


def _build_web_fallback_url(
    provider_id: str,
    dest_lat: float,
    dest_lng: float,
    dest_name: str | None,
) -> str:
    if provider_id == "grab":
        enc_name = quote(dest_name or "Điểm đến TP.HCM", safe="")
        return (
            f"https://r.grab.com/transport?dropoff_lat={dest_lat}"
            f"&dropoff_lng={dest_lng}&dropoff_name={enc_name}"
        )
    if provider_id == "xanhsm":
        return "https://www.xanhsm.com/"
    return "https://be.com.vn/"


def _group_providers(
    fares: list[VehicleFare],
    dest_lat: float,
    dest_lng: float,
    dest_name: str | None,
) -> list[ProviderEstimate]:
    by_brand: dict[str, list[VehicleFare]] = {}
    for fare in fares:
        by_brand.setdefault(fare.brand, []).append(fare)

    providers: list[ProviderEstimate] = []
    for provider_id, brand_name in _PROVIDER_META:
        brand_fares = by_brand.get(brand_name, [])
        bike = next((f for f in brand_fares if "bike" in f.vehicle_type.lower()), None)
        car = next((f for f in brand_fares if "bike" not in f.vehicle_type.lower()), None)
        if bike is None and brand_fares:
            bike = brand_fares[0]
        if car is None and brand_fares:
            car = brand_fares[-1]
        if bike is None or car is None:
            continue

        providers.append(
            ProviderEstimate(
                id=provider_id,
                name=brand_name,
                bike_type=bike.vehicle_type,
                bike_fare_vnd=bike.estimated_fare_vnd,
                bike_duration_min=bike.duration_min,
                car_type=car.vehicle_type,
                car_fare_vnd=car.estimated_fare_vnd,
                car_duration_min=car.duration_min,
                duration_min=min(bike.duration_min, car.duration_min),
                deep_link=bike.deep_link or car.deep_link,
                web_fallback_url=_build_web_fallback_url(
                    provider_id, dest_lat, dest_lng, dest_name
                ),
            )
        )
    return providers


async def _find_indoor_replacement(
    db: AsyncSession,
    district: str | None,
    used_ids: set[str],
    used_names: set[str],
) -> Place | None:
    """Query DB `places` for an unused indoor place, preferring the same district."""
    queries: list[Any] = []
    if district:
        queries.append(
            select(Place)
            .where(
                Place.is_indoor.is_(True),
                Place.is_active.is_(True),
                Place.district == district,
            )
            .order_by(Place.average_rating.desc())
        )
    queries.append(
        select(Place)
        .where(Place.is_indoor.is_(True), Place.is_active.is_(True))
        .order_by(Place.average_rating.desc())
    )

    for stmt in queries:
        result = await db.execute(stmt)
        for candidate in result.scalars().all():
            if candidate.id not in used_ids and candidate.name not in used_names:
                return candidate
    return None


@router.post(
    "/estimate",
    response_model=TransitEstimateResponse,
    summary="Ước tính quãng đường, thời gian và cước 3 hãng xe (Grab / Xanh SM / Be)",
)
async def estimate_transit(payload: TransitEstimateRequest) -> TransitEstimateResponse:
    """Estimate Haversine/road distance, duration, deep links, and 3-provider fares."""
    parsed_time = _parse_time_str(payload.current_time)
    rush_active = bool(parsed_time is not None and is_rush_hour(parsed_time))

    straight_km = round(
        haversine_km(payload.origin_lat, payload.origin_lng, payload.dest_lat, payload.dest_lng),
        3,
    )
    summary = calculate_transit(
        payload.origin_lat,
        payload.origin_lng,
        payload.dest_lat,
        payload.dest_lng,
        dropoff_name=payload.dest_name,
        dropoff_address=payload.dest_address,
    )
    assert summary is not None

    road_km = float(summary["distance_km"])
    duration_min = int(summary["duration_min"])
    if rush_active:
        duration_min += RUSH_HOUR_BUFFER_MINUTES

    raw_fares = estimate_ride_fares(
        road_km,
        dropoff_lat=payload.dest_lat,
        dropoff_lng=payload.dest_lng,
        dropoff_name=payload.dest_name,
        dropoff_address=payload.dest_address,
    )
    fares = [
        fare.model_copy(update={"duration_min": fare.duration_min + RUSH_HOUR_BUFFER_MINUTES})
        if rush_active
        else fare
        for fare in raw_fares
    ]
    providers = _group_providers(fares, payload.dest_lat, payload.dest_lng, payload.dest_name)

    return TransitEstimateResponse(
        mode=str(summary["mode"]),
        straight_distance_km=straight_km,
        distance_km=road_km,
        duration_min=duration_min,
        estimated_fare_vnd=int(summary["estimated_fare_vnd"]),
        label=str(summary["label"]),
        is_rush_hour=rush_active,
        is_rain_mode=payload.is_raining,
        recommended_vehicles=get_rain_transport_modes() if payload.is_raining else [],
        fares=fares,
        providers=providers,
    )


@router.post(
    "/adapt",
    response_model=TransitAdaptResponse,
    summary="Áp dụng kịch bản thích ứng trời mưa & giờ cao điểm cho lịch trình",
)
async def adapt_itinerary(
    payload: TransitAdaptRequest,
    db: DBSession,
) -> TransitAdaptResponse:
    """
    Adapt itinerary stops for rain and rush-hour conditions:
    - Rain: swap outdoor stops to same-district indoor places from `places` DB
      and switch transit to covered vehicles (`grab_car`).
    - Rush hour: add +20 minutes buffer to travel duration (idempotent).
    """
    parsed_time = _parse_time_str(payload.current_time)
    effective_time = (
        parsed_time if parsed_time is not None else (time(17, 30) if payload.is_traffic else None)
    )
    rush_active = bool(effective_time is not None and is_rush_hour(effective_time))

    used_ids: set[str] = {str(item["place_id"]) for item in payload.items if item.get("place_id")}
    used_names: set[str] = {
        str(item["place_name"]) for item in payload.items if item.get("place_name")
    }

    adapted_items: list[dict[str, Any]] = []
    replaced_stops: list[ReplacedStopInfo] = []

    for item in payload.items:
        is_target_day = payload.day_number is None or item.get("day_number") == payload.day_number
        item_copy = dict(item)
        if not is_target_day:
            adapted_items.append(item_copy)
            continue

        if (
            payload.is_raining
            and payload.replace_outdoor
            and not item_copy.get("is_indoor", False)
            and not item_copy.get("visited", False)
        ):
            replacement = await _find_indoor_replacement(
                db, item_copy.get("district"), used_ids, used_names
            )
            if replacement is not None:
                original_name = str(item_copy.get("place_name") or "Điểm ngoài trời")
                used_ids.add(replacement.id)
                used_names.add(replacement.name)
                item_copy.update(
                    {
                        "place_id": replacement.id,
                        "place_name": replacement.name,
                        "address": replacement.address,
                        "district": replacement.district,
                        "latitude": replacement.latitude,
                        "longitude": replacement.longitude,
                        "category": replacement.category,
                        "is_indoor": True,
                        "estimated_cost": replacement.entry_fee_vnd,
                        "photo_url": replacement.photo_url,
                        "description": replacement.description,
                        "editorial_score": replacement.average_rating,
                    }
                )
                replaced_stops.append(
                    ReplacedStopInfo(
                        day_number=item_copy.get("day_number"),
                        order_index=item_copy.get("order_index"),
                        original_place_name=original_name,
                        replacement_place_name=replacement.name,
                        district=replacement.district,
                    )
                )

        if isinstance(item_copy.get("transit_info"), dict):
            transit = dict(item_copy["transit_info"])
            if not payload.is_raining and transit.get("is_rain_mode"):
                transit["mode"] = payload.default_transport_mode
                transit["is_rain_mode"] = False
                transit["estimated_fare_vnd"] = round(
                    int(transit.get("estimated_fare_vnd", 35000)) / 1.5
                )
            if not rush_active and transit.get("is_rush_hour"):
                transit["duration_min"] = max(
                    0,
                    int(transit.get("duration_min", 20)) - RUSH_HOUR_BUFFER_MINUTES,
                )
                transit["is_rush_hour"] = False

            if payload.is_raining or rush_active:
                transit = adapt_transit_info(
                    transit,
                    current_time=effective_time,
                    is_raining=payload.is_raining,
                )
            item_copy["transit_info"] = transit

        adapted_items.append(item_copy)

    if payload.is_raining and rush_active:
        summary_msg = (
            "Đã bật chế độ trời mưa (điểm trong nhà & xe có mái che) và kẹt xe (+20 phút)."
        )
    elif payload.is_raining:
        summary_msg = (
            f"Đã bật chế độ trời mưa: đổi {len(replaced_stops)} điểm ngoài trời "
            "sang điểm trong nhà và ưu tiên xe có mái che."
        )
    elif rush_active:
        summary_msg = "Đã bật chế độ giờ cao điểm: cộng thêm 20 phút dự phòng di chuyển."
    else:
        summary_msg = "Đã khôi phục chế độ di chuyển tiêu chuẩn."

    return TransitAdaptResponse(
        items=adapted_items,
        is_raining=payload.is_raining,
        is_rush_hour=rush_active,
        recommended_vehicles=get_rain_transport_modes() if payload.is_raining else [],
        replaced_stops=replaced_stops,
        summary_message=summary_msg,
    )
