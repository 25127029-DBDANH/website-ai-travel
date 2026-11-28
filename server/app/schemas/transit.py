"""
transit.py — Pydantic schemas for Transit estimation and Adaptive contingency endpoints.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.utils.transit_calculator import VehicleFare

# Bounding box địa lý TP. Hồ Chí Minh (bao gồm nội thành đến Cần Giờ / Củ Chi)
HCMC_LAT_MIN: float = 10.35
HCMC_LAT_MAX: float = 11.20
HCMC_LNG_MIN: float = 106.35
HCMC_LNG_MAX: float = 107.05


class TransitEstimateRequest(BaseModel):
    """Input payload for estimating route distance, duration, and 3-brand ride fares."""

    origin_lat: float = Field(
        ...,
        ge=HCMC_LAT_MIN,
        le=HCMC_LAT_MAX,
        description="Vĩ độ điểm xuất phát (trong phạm vi TP.HCM)",
    )
    origin_lng: float = Field(
        ...,
        ge=HCMC_LNG_MIN,
        le=HCMC_LNG_MAX,
        description="Kinh độ điểm xuất phát (trong phạm vi TP.HCM)",
    )
    dest_lat: float = Field(
        ...,
        ge=HCMC_LAT_MIN,
        le=HCMC_LAT_MAX,
        description="Vĩ độ điểm đến (trong phạm vi TP.HCM)",
    )
    dest_lng: float = Field(
        ...,
        ge=HCMC_LNG_MIN,
        le=HCMC_LNG_MAX,
        description="Kinh độ điểm đến (trong phạm vi TP.HCM)",
    )
    is_raining: bool = Field(default=False, description="Có đang mưa không")
    current_time: str | None = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}$",
        description="Giờ kiểm tra cao điểm (HH:MM)",
    )


class ProviderEstimate(BaseModel):
    """Grouped transit estimate for a single ride-hailing provider (estimated)."""

    id: str = Field(description="Mã hãng xe: grab, xanhsm, be")
    name: str = Field(description="Tên hiển thị của hãng xe")
    bike_type: str = Field(description="Tên dịch vụ xe máy")
    bike_fare_vnd: int = Field(ge=0, description="Giá cước xe máy ước tính (VND)")
    bike_duration_min: int = Field(ge=0, description="Thời gian dự kiến đi xe máy (phút)")
    car_type: str = Field(description="Tên dịch vụ ô tô/taxi")
    car_fare_vnd: int = Field(ge=0, description="Giá cước ô tô ước tính (VND)")
    car_duration_min: int = Field(ge=0, description="Thời gian dự kiến đi ô tô (phút)")
    duration_min: int = Field(ge=0, description="Thời gian dự kiến đại diện (phút)")


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
        description="Danh sách 3 hãng xe với giá ước tính",
    )


class AdaptTransitInfo(BaseModel):
    """Typed transit segment nested inside an itinerary stop."""

    model_config = ConfigDict(extra="allow")

    mode: str | None = Field(default=None, description="Phương tiện di chuyển")
    distance_km: float | None = Field(default=None, ge=0, description="Quãng đường (km)")
    duration_min: int | None = Field(default=None, ge=0, description="Thời gian di chuyển (phút)")
    estimated_fare_vnd: int | None = Field(default=None, ge=0, description="Cước ước tính (VND)")
    original_fare_vnd: int | None = Field(default=None, ge=0, description="Cước gốc trước khi mưa")
    original_mode: str | None = Field(default=None, description="Phương tiện gốc trước khi mưa")
    is_rain_mode: bool = Field(default=False, description="Trạng thái chế độ trời mưa")
    is_rush_hour: bool = Field(default=False, description="Trạng thái chế độ giờ cao điểm")
    label: str | None = Field(default=None, description="Nhãn hiển thị chặng di chuyển")


class AdaptItineraryItem(BaseModel):
    """Typed itinerary stop accepted by POST /api/v1/transit/adapt."""

    model_config = ConfigDict(extra="allow")

    day_number: int | None = Field(default=None, ge=1, description="Ngày thứ mấy của lịch trình")
    order_index: int | None = Field(default=None, ge=0, description="Thứ tự điểm dừng trong ngày")
    place_id: str | None = None
    place_name: str | None = None
    address: str | None = None
    district: str | None = None
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    category: str | None = None
    is_indoor: bool = False
    visited: bool = False
    estimated_cost: int | None = Field(default=None, ge=0)
    transit_info: AdaptTransitInfo | None = None


class TransitAdaptRequest(BaseModel):
    """Input payload for adapting itinerary stops and transit under rain / rush hour."""

    items: list[AdaptItineraryItem] = Field(
        default_factory=list,
        max_length=60,
        description="Danh sách chặng lịch trình (tối đa 60 chặng)",
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
