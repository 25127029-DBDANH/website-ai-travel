from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.schemas.ai import ChatMessageInput, ChatResponse
from app.services.gemini_service import GeminiService

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(chat_in: ChatMessageInput, current_user: dict = Depends(get_current_user)):
    """Trò chuyện cùng AI tư vấn du lịch TP.HCM"""
    return {
        "reply": f"Chào bạn! Tôi có thể giúp bạn tối ưu hóa lịch trình khám phá TP.HCM. Bạn muốn ghé thăm các quán ăn vặt hay di tích lịch sử?",
        "mini_map": {
            "center": [10.7769, 106.7009],
            "zoom": 14,
            "highlight_marker": "Nhà thờ Đức Bà & Bưu điện Trung tâm"
        },
        "quick_suggestions": [
            {"title": "Tìm quán ốc ngon Quận 4", "action_type": "SEARCH_FOOD", "payload": {"district": "Quận 4"}},
            {"title": "Xem phương án trời mưa", "action_type": "TRIGGER_RAIN_MODE", "payload": {}}
        ]
    }
