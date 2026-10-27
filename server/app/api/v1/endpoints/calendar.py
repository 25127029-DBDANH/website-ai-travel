from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.schemas.calendar import CalendarSyncRequest, CalendarSyncResponse
from app.services.calendar_service import CalendarService

router = APIRouter()

@router.get("/auth-url")
async def get_calendar_auth_url(current_user: dict = Depends(get_current_user)):
    url = await CalendarService.get_authorization_url(user_id=current_user["id"])
    return {"auth_url": url}

@router.post("/sync", response_model=CalendarSyncResponse)
async def sync_calendar(sync_in: CalendarSyncRequest, current_user: dict = Depends(get_current_user)):
    """Đồng bộ lịch trình lên Google Calendar (Yêu cầu 6)"""
    res = await CalendarService.sync_trip_events(
        user_id=current_user["id"],
        trip_data={"id": sync_in.trip_id},
        reminder_minutes=sync_in.reminder_minutes_before
    )
    return res
