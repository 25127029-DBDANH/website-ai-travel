"""
calendar.py — Pydantic schemas for Calendar and ICS export.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class CalendarActivity(BaseModel):
    """Schema for a single activity/stop to be converted into an iCalendar VEVENT."""

    place_name: str = Field(description="Tên địa điểm / hoạt động")
    day_number: int = Field(
        default=1, ge=1, description="Ngày thứ mấy của chuyến đi (1, 2, ...)"
    )
    start_time: str = Field(
        default="09:00", description="Giờ bắt đầu (định dạng HH:MM)"
    )
    end_time: str = Field(default="11:00", description="Giờ kết thúc (định dạng HH:MM)")
    address: str | None = Field(default=None, description="Địa chỉ của địa điểm")
    description: str | None = Field(default=None, description="Mô tả hoặc lưu ý")
    estimated_cost: int | None = Field(
        default=0, ge=0, description="Chi phí dự kiến (VND)"
    )
    is_indoor: bool | None = Field(
        default=False, description="Địa điểm trong nhà hay ngoài trời"
    )


class CalendarTrip(BaseModel):
    """Schema for a complete trip to export into iCalendar format."""

    id: str = Field(description="Mã định danh chuyến đi (Trip ID)")
    title: str = Field(default="Chuyến đi Sài Gòn", description="Tiêu đề chuyến đi")
    start_date: date | str | None = Field(
        default=None, description="Ngày bắt đầu (YYYY-MM-DD)"
    )
    items: list[CalendarActivity] = Field(
        default_factory=list, description="Danh sách các điểm dừng"
    )


class CalendarExportResponse(BaseModel):
    """Metadata response when generating or previewing calendar data."""

    trip_id: str = Field(description="Trip ID")
    title: str = Field(description="Tên chuyến đi")
    event_count: int = Field(description="Số lượng sự kiện được tạo")
    time_zone: str = Field(default="Asia/Ho_Chi_Minh", description="Múi giờ")
    ics_preview: str | None = Field(
        default=None, description="Nội dung tóm tắt iCalendar"
    )
