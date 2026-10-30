"""
places.py — FastAPI router for Places API endpoints.
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)

Endpoints:
    GET  /api/v1/places/search          — search & filter places
    GET  /api/v1/places/{place_id}      — get place detail (+ Google enrichment)
    GET  /api/v1/places/nearby          — find nearby places (for Swap feature)
"""
from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.places_service import (
    get_nearby_places,
    get_place_by_id,
    search_places,
)

router = APIRouter(prefix="/places", tags=["Places"])

# ---------------------------------------------------------------------------
# Dependency alias
# ---------------------------------------------------------------------------
DBSession = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# GET /api/v1/places/search
# ---------------------------------------------------------------------------
@router.get("/search", summary="Tìm kiếm địa điểm TP.HCM")
async def search_places_endpoint(
    db: DBSession,
    q: Optional[str] = Query(None, description="Từ khoá tìm kiếm (tên địa điểm / mô tả)"),
    district: Optional[str] = Query(None, description='Lọc theo quận/huyện, vd: "Quận 1"'),
    category: Optional[str] = Query(
        None,
        description="Loại địa điểm: attraction | food | culture | shopping | park | entertainment",
    ),
    is_indoor: Optional[bool] = Query(None, description="Lọc địa điểm trong nhà (True/False)"),
    limit: int = Query(20, ge=1, le=100, description="Số kết quả tối đa mỗi trang"),
    offset: int = Query(0, ge=0, description="Vị trí bắt đầu phân trang"),
):
    """
    Tìm kiếm địa điểm TP.HCM với các bộ lọc linh hoạt.

    - **q**: từ khoá tự do (tên, địa chỉ, tag)
    - **district**: lọc theo quận/huyện
    - **category**: lọc theo loại địa điểm
    - **is_indoor**: `true` = trong nhà (bảo tàng, mall…), `false` = ngoài trời
    """
    places = await search_places(
        db,
        q=q,
        district=district,
        category=category,
        is_indoor=is_indoor,
        limit=limit,
        offset=offset,
    )
    return {"total": len(places), "results": places}


# ---------------------------------------------------------------------------
# GET /api/v1/places/nearby  (must come BEFORE /{place_id} to avoid conflict)
# ---------------------------------------------------------------------------
@router.get("/nearby", summary="Tìm địa điểm lân cận trong bán kính")
async def get_nearby_places_endpoint(
    db: DBSession,
    lat: float = Query(..., description="Vĩ độ trung tâm"),
    lng: float = Query(..., description="Kinh độ trung tâm"),
    radius_km: float = Query(2.0, ge=0.1, le=20.0, description="Bán kính tìm kiếm (km)"),
    category: Optional[str] = Query(None, description="Lọc theo loại địa điểm"),
    is_indoor: Optional[bool] = Query(None, description="Lọc trong nhà / ngoài trời"),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Tìm địa điểm lân cận dựa trên toạ độ GPS và bán kính.
    Phục vụ tính năng **Đổi địa điểm (Swap Place)** — gợi ý 2-3 điểm tương đương.
    """
    places = await get_nearby_places(
        db,
        latitude=lat,
        longitude=lng,
        radius_km=radius_km,
        category=category,
        is_indoor=is_indoor,
        limit=limit,
    )
    return {"total": len(places), "results": places}


# ---------------------------------------------------------------------------
# GET /api/v1/places/{place_id}
# ---------------------------------------------------------------------------
@router.get("/{place_id}", summary="Chi tiết một địa điểm")
async def get_place_detail(
    place_id: UUID,
    db: DBSession,
    enrich: bool = Query(
        True,
        description="Có làm phong phú dữ liệu từ Google Places API không?",
    ),
):
    """
    Trả về thông tin chi tiết của một địa điểm theo UUID.

    Nếu `enrich=true` (mặc định), hệ thống sẽ gọi **Google Places API (New)**
    để lấy rating, ảnh và giờ mở cửa thực tế.  Nếu API không khả dụng, dữ liệu
    cục bộ được dùng làm fallback mà không ảnh hưởng trải nghiệm người dùng.
    """
    place = await get_place_by_id(db, place_id, enrich_from_google=enrich)
    if not place:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy địa điểm với id={place_id}",
        )
    return place
