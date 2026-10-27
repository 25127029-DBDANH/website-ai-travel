from pydantic import BaseModel
from typing import Optional

class CalendarSyncRequest(BaseModel):
    trip_id: str
    reminder_minutes_before: int = 30 # Yêu cầu 6: Báo thức trước 30 phút

class CalendarSyncResponse(BaseModel):
    success: bool
    message: str
    synced_events_count: int
    calendar_id: str
