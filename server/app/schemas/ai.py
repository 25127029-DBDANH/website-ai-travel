from typing import Literal

from pydantic import BaseModel, Field


class TripConceptRequest(BaseModel):
    """Thông tin form gửi lên để AI đề xuất concept chuyến đi."""

    start_location: str = Field(min_length=1)
    budget: int = Field(gt=0)
    days: int = Field(ge=1, le=14)
    districts: list[str] = Field(min_length=1)
    places_per_day: int = Field(ge=3, le=6)
    companion: Literal["solo", "couple", "friends", "family"]
    member_count: int = Field(ge=1)
    transport_mode: Literal["walk", "grab_bike", "grab_car", "public"]
    preferences: list[str] = Field(min_length=1)
    pace: Literal["relaxed", "moderate", "packed"]
    special_notes: str = Field(default="", max_length=500)


class ConceptResponse(BaseModel):
    """Concept AI trả về trước khi tạo lịch trình chi tiết."""

    source: Literal["gemini", "fallback"] = "gemini"
    summary: str
    highlights: list[str]
    recommended_districts: list[str]
    route_overview: str
    confirmation_question: str


class PlaceResponse(BaseModel):
    """Thông tin địa điểm mà giao diện lịch trình cần hiển thị."""

    place_id: str
    place_name: str
    category: str
    description: str
    address: str
    district: str
    latitude: float
    longitude: float
    estimated_cost: int
    photo_url: str
    editorial_score: float
    is_indoor: bool
    opening_hours: list[str]
    suggested_duration: int


class TransitInfoResponse(BaseModel):
    """Thông tin chặng di chuyển do backend bổ sung cho mỗi điểm."""

    duration_min: int
    distance_km: float
    mode: Literal["walk", "grab_bike", "grab_car", "public"]
    estimated_fare_vnd: int
    start_time: str
    end_time: str


class ItineraryItemResponse(PlaceResponse):
    """Một địa điểm đã được xếp vào ngày và khung giờ cụ thể."""

    day_number: int
    order_index: int
    time_slot: str
    start_time: str
    end_time: str
    is_lunch: bool = False
    transit_info: TransitInfoResponse | None = None
    visited: bool = False


class TripGenerationRequest(TripConceptRequest):
    """Yêu cầu tạo lịch trình sau khi người dùng duyệt concept."""

    approved_concept: ConceptResponse


class TripGenerationResponse(BaseModel):
    """Danh sách các điểm theo ngày, sẵn sàng cho giao diện lịch trình."""

    itinerary_items: list[ItineraryItemResponse]
    source: Literal["gemini", "fallback"] = "gemini"


class SmartSwapRequest(BaseModel):
    """Thông tin điểm hiện tại và lý do người dùng muốn đổi điểm."""

    current_item: ItineraryItemResponse
    reason: str | None = None


class SmartSwapOption(PlaceResponse):
    """Một địa điểm thay thế kèm lý do phù hợp."""

    replacement_reason: str


class SmartSwapResponse(BaseModel):
    """Hai hoặc ba lựa chọn thay thế để người dùng chọn."""

    alternatives: list[SmartSwapOption] = Field(min_length=2, max_length=3)
    source: Literal["gemini", "fallback"] = "gemini"
