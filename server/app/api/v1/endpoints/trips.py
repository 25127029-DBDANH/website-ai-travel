from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.schemas.trip import TripCreateInput, SwapPlaceInput, SwapPlaceResponse, RatingInput

router = APIRouter()

@router.post("/")
async def create_trip(trip_in: TripCreateInput, current_user: dict = Depends(get_current_user)):
    """Tạo chuyến đi từ Form 8 tiêu chí (Yêu cầu 2)"""
    return {
        "id": "trip-uuid-5678",
        "user_id": current_user["id"],
        "title": f"Chuyến đi TP.HCM ({trip_in.num_days} ngày)",
        "stay_district": trip_in.stay_district,
        "budget_total": trip_in.budget_total,
        "status": "active"
    }

@router.get("/my-trips")
async def get_my_trips(current_user: dict = Depends(get_current_user)):
    """Danh sách My Trips (Yêu cầu 5)"""
    return [
        {
            "id": "trip-uuid-5678",
            "title": "Cuối tuần khám phá Quận 1 & Quận 3",
            "num_days": 2,
            "created_at": "2026-10-27"
        }
    ]

@router.post("/swap-place", response_model=SwapPlaceResponse)
async def swap_place(swap_in: SwapPlaceInput, current_user: dict = Depends(get_current_user)):
    """Đổi địa điểm với 2-3 lựa chọn thay thế (Yêu cầu 2)"""
    return {
        "activity_id": swap_in.activity_id,
        "alternatives": [
            {
                "place_name": "Bảo tàng Mỹ thuật TP.HCM",
                "category": "Nghệ thuật & Di tích",
                "address": "97A Phó Đức Chính, Quận 1",
                "rating": 4.6,
                "description": "Không gian kiến trúc Pháp cổ kính, trưng bày nghệ thuật đương đại."
            },
            {
                "place_name": "Chợ Bến Thành & Phố ẩm thực",
                "category": "Ẩm thực & Mua sắm",
                "address": "Lê Lợi, Phường Bến Thành, Quận 1",
                "rating": 4.4,
                "description": "Biểu tượng văn hóa ẩm thực đặc trưng trung tâm TP.HCM."
            }
        ]
    }

@router.post("/rating")
async def rate_trip(rating_in: RatingInput, current_user: dict = Depends(get_current_user)):
    """Đánh giá lịch trình 1-5 sao (Yêu cầu 5)"""
    return {"message": "Cảm ơn bạn đã đánh giá! Dữ liệu sẽ giúp AI hiểu sở thích của bạn tốt hơn."}
