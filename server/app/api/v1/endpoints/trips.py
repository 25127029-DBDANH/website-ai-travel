from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
import secrets
from datetime import datetime
from app.core.dependencies import get_current_user
from app.db.database import get_connection
from app.services.gemini_service import GeminiService
from app.services.calendar_service import CalendarService
from app.db.hcmc_data import WEATHER_FALLBACKS, RUSH_HOUR_ADVICE

router = APIRouter()

# Schema form 8 tiêu chí theo Yêu cầu 2
class Form8CriteriaInput(BaseModel):
    num_days: int = 2
    stay_district: str = "Quận 1"
    budget_total: float = 2500000
    preferences: List[str] = ["Ẩm thực", "Văn hóa & Lịch sử"]
    group_size: int = 2
    transport_mode: str = "Xe máy"
    pace: str = "Vừa phải"
    special_notes: Optional[str] = None
    start_date: Optional[str] = "2026-11-01"

class SwapPlaceRequest(BaseModel):
    trip_id: str
    activity_id: str
    current_place_name: str
    selected_new_place: Optional[dict] = None

class ContingencyRequest(BaseModel):
    reason: str # 'rain' hoặc 'rush_hour'

class RatingRequest(BaseModel):
    rating_stars: int # 1 - 5 sao
    feedback_text: Optional[str] = None

@router.post("/suggest")
async def get_overview_suggestions(form_in: Form8CriteriaInput, current_user: dict = Depends(get_current_user)):
    """
    Luồng 4 bước - Bước 2: AI đưa gợi ý tổng quan & ý tưởng dựa trên 8 tiêu chí
    """
    suggestions = GeminiService.generate_step2_suggestions(form_in.dict())
    return {
        "step": 2,
        "status": "awaiting_user_confirmation",
        "data": suggestions
    }

@router.post("/create")
async def create_trip_itinerary(form_in: Form8CriteriaInput, current_user: dict = Depends(get_current_user)):
    """
    Luồng 4 bước - Bước 4: Người dùng đồng ý -> AI sinh lịch trình chi tiết và lưu vào Database
    """
    conn = get_connection()
    cursor = conn.cursor()

    trip_id = str(uuid.uuid4())
    share_token = secrets.token_urlsafe(12)
    now = datetime.utcnow().isoformat()
    start_date = form_in.start_date or "2026-11-01"
    title = f"Chuyến đi {form_in.num_days} ngày khám phá TP.HCM ({form_in.stay_district})"

    # 1. Lưu trip
    cursor.execute("""
    INSERT INTO trips (id, user_id, title, start_date, end_date, num_days, stay_district, budget_total, group_size, transport_mode, pace_preference, special_notes, status, share_token, google_calendar_synced, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        trip_id, current_user["id"], title, start_date, start_date,
        form_in.num_days, form_in.stay_district, form_in.budget_total,
        form_in.group_size, form_in.transport_mode, form_in.pace,
        form_in.special_notes or "", "active", share_token, 0, now
    ))

    # 2. Sinh lịch trình chi tiết từng ngày/giờ bằng AI Service
    days_data = GeminiService.generate_step4_itinerary(form_in.dict())

    # 3. Lưu activities vào database
    for day in days_data:
        for act in day["activities"]:
            act_id = str(uuid.uuid4())
            cursor.execute("""
            INSERT INTO activities (id, trip_id, day_number, place_name, category, district, address, latitude, longitude, start_time, end_time, cost_estimate, contingency_indoor_place, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                act_id, trip_id, act["day_number"], act["place_name"], act["category"],
                act["district"], act["address"], act["latitude"], act["longitude"],
                act["start_time"], act["end_time"], act["cost_estimate"],
                act["contingency_indoor_place"], act["description"]
            ))

    conn.commit()
    conn.close()

    return {
        "step": 4,
        "trip_id": trip_id,
        "title": title,
        "share_token": share_token,
        "share_url": f"/s/{share_token}",
        "days": days_data
    }

@router.get("/my-trips")
async def get_my_trips(current_user: dict = Depends(get_current_user)):
    """
    Yêu cầu 5: Bộ sưu tập chuyến đi (My Trips)
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, title, start_date, num_days, stay_district, budget_total, share_token, google_calendar_synced, created_at
    FROM trips
    WHERE user_id = ?
    ORDER BY created_at DESC
    """, (current_user["id"],))
    rows = cursor.fetchall()
    conn.close()

    trips = []
    for r in rows:
        trips.append({
            "id": r["id"],
            "title": r["title"],
            "start_date": r["start_date"],
            "num_days": r["num_days"],
            "stay_district": r["stay_district"],
            "budget_total": r["budget_total"],
            "share_token": r["share_token"],
            "google_calendar_synced": bool(r["google_calendar_synced"]),
            "created_at": r["created_at"]
        })
    return trips

@router.get("/{trip_id}")
async def get_trip_detail(trip_id: str, current_user: dict = Depends(get_current_user)):
    """
    Xem chi tiết lịch trình, bản đồ và các chặng của chuyến đi
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trips WHERE id = ?", (trip_id,))
    trip_row = cursor.fetchone()
    if not trip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi này.")

    cursor.execute("""
    SELECT * FROM activities WHERE trip_id = ? ORDER BY day_number ASC, start_time ASC
    """, (trip_id,))
    act_rows = cursor.fetchall()
    conn.close()

    days_dict = {}
    for a in act_rows:
        day_num = a["day_number"]
        if day_num not in days_dict:
            days_dict[day_num] = {
                "day_number": day_num,
                "activities": []
            }
        days_dict[day_num]["activities"].append({
            "id": a["id"],
            "place_name": a["place_name"],
            "category": a["category"],
            "district": a["district"],
            "address": a["address"],
            "latitude": a["latitude"],
            "longitude": a["longitude"],
            "start_time": a["start_time"],
            "end_time": a["end_time"],
            "cost_estimate": a["cost_estimate"],
            "contingency_indoor_place": a["contingency_indoor_place"],
            "description": a["description"]
        })

    return {
        "id": trip_row["id"],
        "title": trip_row["title"],
        "num_days": trip_row["num_days"],
        "stay_district": trip_row["stay_district"],
        "budget_total": trip_row["budget_total"],
        "share_token": trip_row["share_token"],
        "google_calendar_synced": bool(trip_row["google_calendar_synced"]),
        "days": list(days_dict.values())
    }

@router.post("/swap-place")
async def swap_place(req: SwapPlaceRequest, current_user: dict = Depends(get_current_user)):
    """
    Yêu cầu 2: ĐỔI ĐỊA ĐIỂM (AI đưa ra 2-3 lựa chọn thay thế tương đương cùng khu vực)
    """
    if not req.selected_new_place:
        # Trả về 2-3 lựa chọn thay thế
        alternatives = GeminiService.get_swap_alternatives(req.current_place_name)
        return {
            "action": "SELECT_ALTERNATIVE",
            "message": f"AI đã chuẩn bị 3 địa điểm thay thế tương đương cho '{req.current_place_name}':",
            "alternatives": alternatives
        }
    else:
        # Cập nhật địa điểm mới đã chọn vào database
        new_p = req.selected_new_place
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE activities
        SET place_name = ?, category = ?, district = ?, address = ?, latitude = ?, longitude = ?, cost_estimate = ?, description = ?
        WHERE id = ? AND trip_id = ?
        """, (
            new_p["place_name"], new_p["category"], new_p["district"], new_p["address"],
            new_p["latitude"], new_p["longitude"], new_p["cost"], new_p["description"],
            req.activity_id, req.trip_id
        ))
        conn.commit()
        conn.close()

        return {
            "action": "SWAPPED_SUCCESSFULLY",
            "message": f"Đã đổi thành công sang địa điểm mới: {new_p['place_name']}.",
            "updated_activity": new_p
        }

@router.post("/{trip_id}/contingency")
async def apply_contingency(trip_id: str, req: ContingencyRequest, current_user: dict = Depends(get_current_user)):
    """
    Yêu cầu 4: KỊCH BẢN DỰ PHÒNG THỜI TIẾT / KẸT XE GIỜ CAO ĐIỂM
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM activities WHERE trip_id = ?", (trip_id,))
    acts = cursor.fetchall()
    
    if req.reason == "rain":
        # Chuyển các điểm ngoài trời sang điểm trong nhà
        updated_count = 0
        for a in acts:
            fallback = a["contingency_indoor_place"]
            if fallback:
                cursor.execute("""
                UPDATE activities
                SET place_name = ?, category = 'Tham quan trong nhà (Tránh mưa)'
                WHERE id = ?
                """, (fallback, a["id"]))
                updated_count += 1
        conn.commit()
        conn.close()
        return {
            "applied": "rain_mode",
            "message": f"🌧️ Đã kích hoạt Phương án Trời mưa! Tự động chuyển {updated_count} điểm ngoài trời sang các bảo tàng, workshop và trung tâm thương mại trong nhà có mái che."
        }
    elif req.reason == "rush_hour":
        conn.close()
        return {
            "applied": "rush_hour_mode",
            "message": f"🚦 {RUSH_HOUR_ADVICE['advice']}"
        }
    conn.close()
    return {"message": "Đã ghi nhận phương án dự phòng."}

@router.post("/{trip_id}/rating")
async def rate_trip(trip_id: str, req: RatingRequest, current_user: dict = Depends(get_current_user)):
    """
    Yêu cầu 5: Đánh giá chất lượng lịch trình AI tạo (1-5 sao + phản hồi)
    """
    conn = get_connection()
    cursor = conn.cursor()
    rating_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT OR REPLACE INTO ratings (id, trip_id, user_id, rating_stars, feedback_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (rating_id, trip_id, current_user["id"], req.rating_stars, req.feedback_text or "", now))
    conn.commit()
    conn.close()
    return {"message": f"Cảm ơn bạn đã chấm {req.rating_stars} sao! Đánh giá này sẽ giúp AI ghi nhớ và phục vụ tốt hơn cho chuyến đi sau."}

@router.get("/shared/{share_token}")
async def get_shared_trip(share_token: str):
    """
    Yêu cầu 5: Xem lịch trình công khai bằng liên kết chỉ xem (/s/:shareToken)
    Không yêu cầu đăng nhập đối với người được chia sẻ link xem
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trips WHERE share_token = ?", (share_token,))
    trip_row = cursor.fetchone()
    if not trip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Liên kết chuyến đi không tồn tại hoặc đã bị thu hồi.")

    cursor.execute("SELECT * FROM activities WHERE trip_id = ? ORDER BY day_number ASC, start_time ASC", (trip_row["id"],))
    acts = cursor.fetchall()
    conn.close()

    days_dict = {}
    for a in acts:
        day_num = a["day_number"]
        if day_num not in days_dict:
            days_dict[day_num] = {"day_number": day_num, "activities": []}
        days_dict[day_num]["activities"].append({
            "id": a["id"],
            "place_name": a["place_name"],
            "category": a["category"],
            "district": a["district"],
            "address": a["address"],
            "latitude": a["latitude"],
            "longitude": a["longitude"],
            "start_time": a["start_time"],
            "end_time": a["end_time"],
            "cost_estimate": a["cost_estimate"],
            "description": a["description"]
        })

    return {
        "title": trip_row["title"],
        "num_days": trip_row["num_days"],
        "stay_district": trip_row["stay_district"],
        "budget_total": trip_row["budget_total"],
        "read_only": True,
        "days": list(days_dict.values())
    }
