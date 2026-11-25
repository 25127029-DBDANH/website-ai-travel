"""
calendar.py — API endpoints for iCalendar (.ics) generation and Google Calendar export.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

import json
import logging
from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Trip
from app.db.session import get_db
from app.schemas.calendar import CalendarExportResponse, CalendarTrip
from app.services.calendar_service import generate_ics_content

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["Calendar"])

DBSession = Annotated[AsyncSession, Depends(get_db)]

# ---------------------------------------------------------------------------
# Pre-seeded Demo Trips (Pre-warmed for instant presentation & fallback)
# ---------------------------------------------------------------------------
DEMO_TRIPS: dict[str, dict[str, Any]] = {
    "trip-demo-1": {
        "id": "trip-demo-1",
        "title": "Khám phá Văn hóa & Lịch sử Sài Gòn (3 ngày)",
        "items": [
            {
                "day_number": 1,
                "order_index": 1,
                "start_time": "08:30",
                "end_time": "10:30",
                "place_name": "Dinh Độc Lập (Hội trường Thống Nhất)",
                "address": "135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP.HCM",
                "description": (
                    "Di tích lịch sử cấp quốc gia đặc biệt, biểu tượng thống nhất đất nước."
                ),
                "estimated_cost": 65000,
                "is_indoor": True,
            },
            {
                "day_number": 1,
                "order_index": 2,
                "start_time": "11:00",
                "end_time": "12:30",
                "place_name": "Nhà thờ Đức Bà Sài Gòn",
                "address": "01 Công xã Paris, Phường Bến Nghé, Quận 1, TP.HCM",
                "description": "Kiệt tác kiến trúc Gothic cổ kính trung tâm thành phố.",
                "estimated_cost": 0,
                "is_indoor": False,
            },
            {
                "day_number": 1,
                "order_index": 3,
                "start_time": "13:00",
                "end_time": "14:30",
                "place_name": "Bưu điện Trung tâm Sài Gòn",
                "address": "02 Công xã Paris, Phường Bến Nghé, Quận 1, TP.HCM",
                "description": "Công trình kiến trúc kiểu Pháp đặc trưng, chụp ảnh lưu niệm.",
                "estimated_cost": 0,
                "is_indoor": True,
            },
            {
                "day_number": 2,
                "order_index": 1,
                "start_time": "09:00",
                "end_time": "11:30",
                "place_name": "Bảo tàng Chứng tích Chiến tranh",
                "address": "28 Võ Văn Tần, Phường 6, Quận 3, TP.HCM",
                "description": "Bảo tàng trưng bày hiện vật chiến tranh nổi tiếng thế giới.",
                "estimated_cost": 40000,
                "is_indoor": True,
            },
            {
                "day_number": 2,
                "order_index": 2,
                "start_time": "12:00",
                "end_time": "13:30",
                "place_name": "Phở Hòa Pasteur",
                "address": "260C Pasteur, Phường Võ Thị Sáu, Quận 3, TP.HCM",
                "description": "Thưởng thức phở truyền thống danh tiếng Sài Gòn.",
                "estimated_cost": 95000,
                "is_indoor": True,
            },
        ],
    },
    "demo": {
        "id": "demo",
        "title": "Hành trình Trải nghiệm Sài Gòn Cơ bản",
        "items": [
            {
                "day_number": 1,
                "order_index": 1,
                "start_time": "09:00",
                "end_time": "11:00",
                "place_name": "Chợ Bến Thành",
                "address": "Đường Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
                "description": "Ngôi chợ biểu tượng giao thương sầm uất hơn 100 năm tuổi.",
                "estimated_cost": 50000,
                "is_indoor": True,
            },
            {
                "day_number": 1,
                "order_index": 2,
                "start_time": "11:30",
                "end_time": "13:00",
                "place_name": "Bến Thành Street Food Market",
                "address": "26-28-30 Thủ Khoa Huân, Bến Thành, Quận 1, TP.HCM",
                "description": "Thiên đường ẩm thực đường phố hiện đại, phong phú món ăn.",
                "estimated_cost": 120000,
                "is_indoor": True,
            },
        ],
    },
}


# ---------------------------------------------------------------------------
# Helper: Fetch Trip from Database or Demo Store
# ---------------------------------------------------------------------------
async def _get_trip_data(
    trip_id: str,
    db: AsyncSession,
) -> tuple[str, list[dict[str, Any]]] | None:
    """
    Attempt to load trip title and itinerary items from database or demo catalog.
    Returns (title, items) or None if not found.
    """
    # 1. Query database using injected AsyncSession
    try:
        stmt = select(Trip).where(Trip.id == trip_id)
        res = await db.execute(stmt)
        db_trip = res.scalar_one_or_none()
        if db_trip is not None:
            try:
                items = (
                    json.loads(db_trip.itinerary_json) if db_trip.itinerary_json else []
                )
            except (json.JSONDecodeError, TypeError) as parse_err:
                logger.warning(
                    "Error parsing itinerary_json for trip %s: %s",
                    trip_id,
                    parse_err,
                )
                items = []
            return db_trip.title, items
    except SQLAlchemyError as exc:
        logger.error("Database query failed when fetching trip %s: %s", trip_id, exc)
        raise

    # 2. Check in-memory demo trips (pre-warmed fallback)
    if trip_id in DEMO_TRIPS:
        demo = DEMO_TRIPS[trip_id]
        return demo["title"], demo["items"]

    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get(
    "/ics/{trip_id}",
    summary="Tải file iCalendar (.ics) của chuyến đi (Chuẩn RFC 5545, nhắc 30 phút)",
    response_class=Response,
    responses={
        200: {
            "content": {"text/calendar": {}},
            "description": (
                "File iCalendar (.ics) sẵn sàng nhập vào Google Calendar hoặc Apple Calendar."
            ),
        },
        404: {"description": "Không tìm thấy chuyến đi tương ứng với trip_id."},
    },
)
async def get_trip_ics(
    trip_id: str,
    db: DBSession,
    start_date: str | None = Query(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Ngày bắt đầu hành trình (định dạng YYYY-MM-DD, mặc định ngày mai)",
    ),
) -> Response:
    """
    Export a trip's complete schedule to an RFC 5545 compliant `.ics` calendar file.
    Includes deterministic UIDs, Asia/Ho_Chi_Minh timezone, CRLF formatting,
    and a VALARM popup reminder set 30 minutes before each activity.
    """
    trip_data = await _get_trip_data(trip_id, db)
    if trip_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy chuyến đi với mã: {trip_id}",
        )

    title, items = trip_data
    ics_text = generate_ics_content(
        trip_id=trip_id,
        title=title,
        items=items,
        start_date=start_date,
    )

    filename = f"lich-trinh-saigon-{trip_id}.ics"
    return Response(
        content=ics_text,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.post(
    "/export-ics",
    summary="Sinh file .ics trực tiếp từ dữ liệu JSON (không cần lưu DB)",
    response_class=Response,
)
async def export_ics_from_payload(payload: CalendarTrip) -> Response:
    """
    Generate and return an RFC 5545 `.ics` file directly from a JSON payload.
    Useful for immediate frontend download before saving to database.
    """
    items_dicts = [item.model_dump() for item in payload.items]
    start_date_str = (
        payload.start_date.isoformat()
        if isinstance(payload.start_date, date)
        else payload.start_date
    )

    ics_text = generate_ics_content(
        trip_id=payload.id,
        title=payload.title,
        items=items_dicts,
        start_date=start_date_str,
    )

    filename = f"lich-trinh-saigon-{payload.id}.ics"
    return Response(
        content=ics_text,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.get(
    "/preview/{trip_id}",
    response_model=CalendarExportResponse,
    summary="Xem trước thông tin đồng bộ lịch trước khi tải",
)
async def preview_calendar(
    trip_id: str,
    db: DBSession,
) -> CalendarExportResponse:
    """Return summary metadata and a snippet of the generated .ics file."""
    trip_data = await _get_trip_data(trip_id, db)
    if trip_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy chuyến đi với mã: {trip_id}",
        )

    title, items = trip_data
    ics_text = generate_ics_content(trip_id=trip_id, title=title, items=items)
    preview_snippet = "\n".join(ics_text.split("\r\n")[:10])

    return CalendarExportResponse(
        trip_id=trip_id,
        title=title,
        event_count=len(items),
        time_zone="Asia/Ho_Chi_Minh",
        ics_preview=preview_snippet,
    )
