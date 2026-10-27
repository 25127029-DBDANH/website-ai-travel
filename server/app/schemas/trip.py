from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date

# Form nhập 8 tiêu chí theo Yêu cầu 2 của giảng viên
class TripCreateInput(BaseModel):
    num_days: int
    stay_district: str
    budget_total: float
    preferences: List[str]
    group_size: int = 1
    transport_mode: str = "Xe máy"
    pace: str = "Vừa phải"
    special_notes: Optional[str] = None
    start_date: Optional[date] = None

class SwapPlaceInput(BaseModel):
    trip_id: str
    activity_id: str
    current_place_name: str
    reason: Optional[str] = None # 'chán', 'trời mưa', 'đóng cửa', 'đã từng đi'

class SwapPlaceAlternative(BaseModel):
    place_name: str
    category: str
    address: str
    rating: float
    description: str

class SwapPlaceResponse(BaseModel):
    activity_id: str
    alternatives: List[SwapPlaceAlternative]

class RatingInput(BaseModel):
    trip_id: str
    rating_stars: int # 1 - 5 sao
    feedback_text: Optional[str] = None
