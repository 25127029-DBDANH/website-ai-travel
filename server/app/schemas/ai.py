import re
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, Json, field_validator, model_validator
from pydantic.json_schema import SkipJsonSchema

from app.services.interests import catalog_fields_for

InterestKey = Literal[
    "street_food", "local_classics", "seafood_nhau", "cafe_hopping", "coffee_retro",
    "rooftop_night", "nightlife_street", "french_architecture", "temples_churches",
    "museums_art", "history", "markets", "riverside", "parks", "photo_spots",
    "local_life", "chinatown", "family_fun",
]

_VN_TZ = timezone(timedelta(hours=7))
_TIME_24H_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
_MIN_DAY_WINDOW_MINUTES = 4 * 60


def _parse_hhmm_minutes(value: str) -> int:
    match = _TIME_24H_RE.fullmatch(value)
    if match is None:
        raise ValueError("Time must be in 24-hour HH:MM format (00:00-23:59).")
    return int(match.group(1)) * 60 + int(match.group(2))


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
    interests: list[InterestKey] = Field(default_factory=list, max_length=5)
    vibe_energy: int | None = Field(default=None, ge=0, le=100)
    vibe_spend: int | None = Field(default=None, ge=0, le=100)
    pace: Literal["relaxed", "moderate", "packed"]
    special_notes: str = Field(default="", max_length=500)
    # Giới hạn để chuỗi người dùng nhập không phình prompt Gemini (chống prompt injection dài).
    dietary: list[Annotated[str, Field(max_length=40)]] = Field(default_factory=list, max_length=5)
    avoid_districts: list[Annotated[str, Field(max_length=40)]] = Field(
        default_factory=list, max_length=3
    )
    travel_date: date | None = None
    day_start: str | None = None
    day_end: str | None = None
    has_children: bool = False
    has_elderly: bool = False
    mobility: Literal["normal", "limited"] = "normal"
    prefer_indoor: bool = False
    must_visit_ids: list[Annotated[str, Field(max_length=64)]] = Field(
        default_factory=list, max_length=5
    )

    @field_validator("travel_date")
    @classmethod
    def _validate_travel_date(cls, value: date | None) -> date | None:
        if value is None:
            return None
        today_vn = datetime.now(_VN_TZ).date()
        min_date = today_vn - timedelta(days=1)
        max_date = today_vn + timedelta(days=365)
        if value < min_date or value > max_date:
            raise ValueError(
                "travel_date must be within 1 day before today and 365 days ahead "
                "(Asia/Ho_Chi_Minh)."
            )
        return value

    @field_validator("day_start", "day_end")
    @classmethod
    def _validate_day_time(cls, value: str | None) -> str | None:
        if value is None:
            return None
        _parse_hhmm_minutes(value)
        return value

    @model_validator(mode="after")
    def _validate_day_window(self) -> "TripConceptRequest":
        if self.day_start is not None and self.day_end is not None:
            start_min = _parse_hhmm_minutes(self.day_start)
            end_min = _parse_hhmm_minutes(self.day_end)
            if end_min - start_min < _MIN_DAY_WINDOW_MINUTES:
                raise ValueError("day_end must be at least 4 hours after day_start.")
        return self


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
    # Ranking uses the original catalog category and tags, including JSON-encoded seed tags.
    # Keep these internal inputs out of the itinerary and Gemini response schemas.
    catalog_category: SkipJsonSchema[str | None] = Field(default=None, exclude=True)
    tags: SkipJsonSchema[list[str] | Json[list[str]]] = Field(default_factory=list, exclude=True)
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

    @model_validator(mode="before")
    @classmethod
    def _include_catalog_fields(cls, data: Any) -> Any:
        if isinstance(data, dict) and isinstance(place_id := data.get("place_id"), str):
            if fields := catalog_fields_for(place_id):
                return {**fields, **data}
        return data


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


class ItineraryPlanItem(BaseModel):
    """Khung giờ của một địa điểm do Gemini trả về (chỉ gồm place_id và lịch)."""

    place_id: str
    day_number: int
    order_index: int
    start_time: str
    end_time: str
    is_lunch: bool = False


class ItineraryPlanResponse(BaseModel):
    """Schema gọn gửi Gemini khi tạo lịch trình, trước khi ghép lại từ catalog."""

    itinerary_items: list[ItineraryPlanItem]


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
