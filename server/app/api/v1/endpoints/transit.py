"""
transit.py — API endpoints for multi-provider fare estimation and adaptive contingency.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

from datetime import time
from typing import Annotated, Any

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
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Định dạng giờ không hợp lệ (HH:MM): {value}",
        ) from exc


def _format_transit_label(
    mode: str,
    distance_km: float,
    duration_min: int,
    estimated_fare_vnd: int,
) -> str:
    if mode == "walk":
        return f"🚶 {duration_min} min walk ({int(distance_km * 1000)}m)"
    return f"🚕 {duration_min} min ride (~₫{estimated_fare_vnd:,})"


def _group_providers(fares: list[VehicleFare]) -> list[ProviderEstimate]:
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
            )
        )
    return providers


async def _batch_indoor_candidates_by_district(
    db: AsyncSession,
    districts: set[str],
) -> dict[str, list[Place]]:
    """Fetch active indoor places for all target districts in a single query."""
    if not districts:
        return {}
    stmt = (
        select(Place)
        .where(
            Place.is_indoor.is_(True),
            Place.is_active.is_(True),
            Place.district.in_(sorted(districts)),
        )
        .order_by(Place.average_rating.desc())
    )
    result = await db.execute(stmt)
    grouped: dict[str, list[Place]] = {}
    for place in result.scalars().all():
        grouped.setdefault(place.district, []).append(place)
    return grouped


def _pick_same_district_indoor(
    candidates_by_district: dict[str, list[Place]],
    district: str | None,
    category: str | None,
    used_ids: set[str],
    used_names: set[str],
) -> Place | None:
    """Pick an unused indoor place in the SAME district, preferring the same category."""
    if not district:
        return None
    candidates = candidates_by_district.get(district, [])
    unused = [p for p in candidates if p.id not in used_ids and p.name not in used_names]
    if not unused:
        return None

    if category:
        norm_cat = category.strip().lower()
        same_cat = next(
            (p for p in unused if (p.category or "").strip().lower() == norm_cat),
            None,
        )
        if same_cat is not None:
            return same_cat

    return unused[0]


def _sync_transit_label(transit: dict[str, Any]) -> None:
    """Keep `transit["label"]` synchronized with duration_min and estimated_fare_vnd."""
    if "label" not in transit and "distance_km" not in transit:
        return
    mode = str(transit.get("mode") or "ride")
    distance_km = float(transit.get("distance_km") or 0.0)
    duration_min = int(transit.get("duration_min") or 0)
    fare_vnd = int(transit.get("estimated_fare_vnd") or 0)
    transit["label"] = _format_transit_label(mode, distance_km, duration_min, fare_vnd)


def _apply_transit_flags(
    transit_raw: dict[str, Any],
    *,
    is_raining: bool,
    rush_active: bool,
    effective_time: time | None,
    default_transport_mode: str,
) -> dict[str, Any]:
    """Update a single stop's transit_info for rain & rush hour (idempotent + exact revert)."""
    transit = dict(transit_raw)

    if not is_raining and transit.get("is_rain_mode"):
        original_mode = transit.pop("original_mode", None)
        original_fare = transit.pop("original_fare_vnd", None)
        transit["mode"] = original_mode or default_transport_mode
        if original_fare is not None:
            transit["estimated_fare_vnd"] = int(original_fare)
        transit["is_rain_mode"] = False

    if not rush_active and transit.get("is_rush_hour"):
        transit["duration_min"] = max(
            0,
            int(transit.get("duration_min", 20)) - RUSH_HOUR_BUFFER_MINUTES,
        )
        transit["is_rush_hour"] = False

    if is_raining or rush_active:
        transit = adapt_transit_info(
            transit,
            current_time=effective_time,
            is_raining=is_raining,
        )

    _sync_transit_label(transit)
    return transit


@router.post(
    "/estimate",
    response_model=TransitEstimateResponse,
    summary="Ước tính quãng đường, thời gian và cước 3 hãng xe (Grab / Xanh SM / Be)",
)
async def estimate_transit(payload: TransitEstimateRequest) -> TransitEstimateResponse:
    """Estimate Haversine/road distance, duration, and estimated 3-provider fares in HCMC."""
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
    )
    assert summary is not None

    mode = str(summary["mode"])
    road_km = float(summary["distance_km"])
    duration_min = int(summary["duration_min"])
    estimated_fare_vnd = int(summary["estimated_fare_vnd"])
    if rush_active:
        duration_min += RUSH_HOUR_BUFFER_MINUTES

    label = _format_transit_label(mode, road_km, duration_min, estimated_fare_vnd)

    raw_fares = estimate_ride_fares(road_km)
    fares = [
        fare.model_copy(update={"duration_min": fare.duration_min + RUSH_HOUR_BUFFER_MINUTES})
        if rush_active
        else fare
        for fare in raw_fares
    ]
    providers = _group_providers(fares)

    return TransitEstimateResponse(
        mode=mode,
        straight_distance_km=straight_km,
        distance_km=road_km,
        duration_min=duration_min,
        estimated_fare_vnd=estimated_fare_vnd,
        label=label,
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
    - Rain: swap outdoor stops to same-district indoor places (same category preferred)
      from `places` DB, recalculate affected transit legs, and switch transit to `grab_car`.
    - Rush hour: add +20 minutes buffer to travel duration when `is_traffic` is True
      or `current_time` falls in [17:00, 19:00), and keep `label` synchronized.
    """
    parsed_time = _parse_time_str(payload.current_time)
    rush_active = bool(
        payload.is_traffic or (parsed_time is not None and is_rush_hour(parsed_time))
    )
    effective_time = time(17, 30) if rush_active else parsed_time

    raw_items = [item.model_dump() for item in payload.items]
    used_ids: set[str] = {str(it["place_id"]) for it in raw_items if it.get("place_id")}
    used_names: set[str] = {str(it["place_name"]) for it in raw_items if it.get("place_name")}

    target_districts: set[str] = set()
    if payload.is_raining and payload.replace_outdoor:
        for it in raw_items:
            is_target_day = payload.day_number is None or it.get("day_number") == payload.day_number
            if (
                is_target_day
                and not it.get("is_indoor", False)
                and not it.get("visited", False)
                and it.get("district")
            ):
                target_districts.add(str(it["district"]))

    candidates_by_district = await _batch_indoor_candidates_by_district(db, target_districts)

    adapted_items: list[dict[str, Any]] = []
    replaced_stops: list[ReplacedStopInfo] = []
    replaced_indices: set[int] = set()
    kept_outdoor_count = 0

    for idx, item_copy in enumerate(raw_items):
        is_target_day = (
            payload.day_number is None or item_copy.get("day_number") == payload.day_number
        )
        if not is_target_day:
            adapted_items.append(item_copy)
            continue

        if (
            payload.is_raining
            and payload.replace_outdoor
            and not item_copy.get("is_indoor", False)
            and not item_copy.get("visited", False)
        ):
            replacement = _pick_same_district_indoor(
                candidates_by_district,
                item_copy.get("district"),
                item_copy.get("category"),
                used_ids,
                used_names,
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
                replaced_indices.add(idx)
                replaced_stops.append(
                    ReplacedStopInfo(
                        day_number=item_copy.get("day_number"),
                        order_index=item_copy.get("order_index"),
                        original_place_name=original_name,
                        replacement_place_name=replacement.name,
                        district=replacement.district,
                    )
                )
            else:
                kept_outdoor_count += 1

        adapted_items.append(item_copy)

    # Recalculate transit_info for replaced legs and apply rain/rush flags uniformly
    for idx, item_copy in enumerate(adapted_items):
        is_target_day = (
            payload.day_number is None or item_copy.get("day_number") == payload.day_number
        )
        if not is_target_day:
            continue

        transit_dict = item_copy.get("transit_info")
        if not isinstance(transit_dict, dict):
            continue

        leg_affected = idx in replaced_indices or (idx - 1) in replaced_indices
        if leg_affected and idx > 0:
            prev_item = adapted_items[idx - 1]
            same_day = prev_item.get("day_number") == item_copy.get("day_number")
            if same_day:
                recalc = calculate_transit(
                    prev_item.get("latitude"),
                    prev_item.get("longitude"),
                    item_copy.get("latitude"),
                    item_copy.get("longitude"),
                )
                if recalc is not None:
                    transit_dict = {
                        **transit_dict,
                        **recalc,
                        "is_rain_mode": False,
                        "is_rush_hour": False,
                    }
                    transit_dict.pop("original_fare_vnd", None)
                    transit_dict.pop("original_mode", None)

        item_copy["transit_info"] = _apply_transit_flags(
            transit_dict,
            is_raining=payload.is_raining,
            rush_active=rush_active,
            effective_time=effective_time,
            default_transport_mode=payload.default_transport_mode,
        )

    if payload.is_raining and rush_active:
        summary_msg = (
            "Đã bật chế độ trời mưa (ưu tiên điểm trong nhà cùng quận & xe có mái che) "
            "và kẹt xe (+20 phút)."
        )
    elif payload.is_raining:
        summary_msg = (
            f"Đã bật chế độ trời mưa: đổi {len(replaced_stops)} điểm ngoài trời "
            "sang điểm trong nhà cùng quận và ưu tiên xe có mái che."
        )
        if kept_outdoor_count > 0:
            summary_msg += (
                f" ({kept_outdoor_count} điểm giữ nguyên do quận chưa có điểm trong nhà trống)."
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
