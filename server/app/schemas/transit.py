"""
transit.py — Pydantic schemas for Transit estimation and Adaptive contingency endpoints.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.utils.transit_calculator import VehicleFare


class TransitEstimateRequest(BaseModel):
    """Input payload for estimating route distance, duration, and 3-brand ride fares."""

    origin_lat: float = Field(..., ge=-90.0, le=90.0, description="Vĩ độ điểm xuất phát")
    origin_lng: float = Field(..., ge=-180.0, le=180.0, description="Kinh độ điểm xuất phát")
    dest_lat: float = Field(..., ge=-90.0, le=90.0, description="Vĩ độ điểm đến")
    dest_lng: float = Field(..., ge=-180.0, le=180.0, description="Kinh độ điểm đến")
    dest_name: str | None = Field(default="Điểm đến TP.HCM", description="Tên điểm đến")
    dest_address: str | None = Field(default="TP. Hồ Chí Minh", description="Địa chỉ điểm đến")
    is_raining: bool = Field(default=False, description="Có đang mưa không")
    current_time: str | None = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}$",
        description="Giờ kiểm tra cao điểm (HH:MM)",
    )


class ProviderEstimate(BaseModel):
    """Grouped transit estimate for a single ride-hailing provider."""

    id: str = Field(description="Mã hãng xe: grab, xanhsm, be")
    name: str = Field(description="Tên hiển thị của hãng xe")
    bike_type: str = Field(description="Tên dịch vụ xe máy")
    bike_fare_vnd: int = Field(ge=0, description="Giá cước xe máy ước tính (VND)")
    bike_duration_min: int = Field(ge=0, description="Thời gian dự kiến đi xe máy (phút)")
    car_type: str = Field(description="Tên dịch vụ ô tô/taxi")
    car_fare_vnd: int = Field(ge=0, description="Giá cước ô tô ước tính (VND)")
    car_duration_min: int = Field(ge=0, description="Thời gian dự kiến đi ô tô (phút)")
    duration_min: int = Field(ge=0, description="Thời gian dự kiến đại diện (phút)")
    deep_link: str = Field(description="Deep link mở ứng dụng gọi xe")
    web_fallback_url: str = Field(description="URL dự phòng khi không mở được app trên desktop")


class TransitEstimateResponse(BaseModel):
    """Complete transit estimate including summary metrics and 3-provider breakdown."""

    mode: str = Field(description="walk hoặc ride")
    straight_distance_km: float = Field(
        ge=0, description="Khoảng cách đường chim bay Haversine (km)"
    )
    distance_km: float = Field(ge=0, description="Khoảng cách ước tính đường bộ nội đô (km)")
    duration_min: int = Field(ge=0, description="Thời gian di chuyển ước tính (phút)")
    estimated_fare_vnd: int = Field(ge=0, description="Cước tham chiếu chung (VND)")
    label: str = Field(description="Nhãn hiển thị ngắn")
    is_rush_hour: bool = Field(default=False, description="Đang trong khung giờ cao điểm hay không")
    is_rain_mode: bool = Field(default=False, description="Đang bật chế độ trời mưa hay không")
    recommended_vehicles: list[str] = Field(
        default_factory=list,
        description="Các loại xe khuyến nghị khi trời mưa",
    )
    fares: list[VehicleFare] = Field(default_factory=list, description="Danh sách 6 lựa chọn xe")
    providers: list[ProviderEstimate] = Field(
        default_factory=list,
        description="Danh sách 3 hãng xe kèm deep link",
    )


class TransitAdaptRequest(BaseModel):
    """Input payload for adapting itinerary stops and transit under rain / rush hour."""

    items: list[dict[str, Any]] = Field(
        default_factory=list, description="Danh sách chặng lịch trình"
    )
    day_number: int | None = Field(
        default=None, ge=1, description="Chỉ áp dụng cho ngày cụ thể nếu truyền"
    )
    is_raining: bool = Field(default=False, description="Kích hoạt kịch bản trời mưa")
    is_traffic: bool = Field(default=False, description="Kích hoạt kịch bản kẹt xe giờ cao điểm")
    current_time: str | None = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}$",
        description="Giờ hiện tại (HH:MM) để kiểm tra giờ cao điểm",
    )
    replace_outdoor: bool = Field(
        default=True,
        description="Thay thế điểm ngoài trời bằng điểm trong nhà cùng quận khi trời mưa",
    )
    default_transport_mode: str = Field(
        default="grab_bike",
        description="Phương tiện mặc định khi tắt chế độ trời mưa",
    )


class ReplacedStopInfo(BaseModel):
    """Metadata describing an outdoor stop swapped to an indoor alternative."""

    day_number: int | None = None
    order_index: int | None = None
    original_place_name: str
    replacement_place_name: str
    district: str | None = None


class TransitAdaptResponse(BaseModel):
    """Adapted itinerary payload and metadata returned by POST /api/v1/transit/adapt."""

    items: list[dict[str, Any]]
    is_raining: bool
    is_rush_hour: bool
    recommended_vehicles: list[str] = Field(default_factory=list)
    replaced_stops: list[ReplacedStopInfo] = Field(default_factory=list)
    summary_message: str
