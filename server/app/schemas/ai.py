from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatMessageInput(BaseModel):
    message: str
    trip_id: Optional[str] = None

class QuickSuggestion(BaseModel):
    title: str
    action_type: str
    payload: Dict[str, Any]

class ChatResponse(BaseModel):
    reply: str
    mini_map: Optional[Dict[str, Any]] = None # Hiển thị mini-map card theo Yêu cầu 3
    quick_suggestions: Optional[List[QuickSuggestion]] = []
    updated_itinerary: Optional[Dict[str, Any]] = None
