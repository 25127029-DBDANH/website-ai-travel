from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_current_user
from app.db.database import get_connection
from app.services.calendar_service import CalendarService

router = APIRouter()

class SyncCalendarInput(BaseModel):
    trip_id: str
    reminder_minutes: int = 30 # Nhắc nhở trước 30 phút theo Yêu cầu 6

@router.post("/sync")
async def sync_google_calendar(input_data: SyncCalendarInput, current_user: dict = Depends(get_current_user)):
    """
    Yêu cầu 6: Tự động đồng bộ lịch trình lên Google Calendar kèm thông báo nhắc trước 30 phút
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trips WHERE id = ?", (input_data.trip_id,))
    trip = cursor.fetchone()
    if not trip:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi.")

    cursor.execute("SELECT * FROM activities WHERE trip_id = ? ORDER BY day_number ASC, start_time ASC", (input_data.trip_id,))
    acts = cursor.fetchall()
    
    # Cập nhật trạng thái đã sync
    cursor.execute("UPDATE trips SET google_calendar_synced = 1 WHERE id = ?", (input_data.trip_id,))
    conn.commit()
    conn.close()

    act_list = [dict(a) for a in acts]
    events = CalendarService.create_trip_calendar_links(
        trip_title=trip["title"],
        activities=act_list,
        start_date=trip["start_date"]
    )

    return {
        "success": True,
        "message": f"🎉 Đã tạo đồng bộ Google Calendar cho {len(events)} hoạt động! Bạn có thể nhấn vào từng sự kiện để lưu trực tiếp vào lịch cá nhân với thông báo báo thức trước {input_data.reminder_minutes} phút.",
        "trip_title": trip["title"],
        "reminder_minutes": input_data.reminder_minutes,
        "events": events
    }
