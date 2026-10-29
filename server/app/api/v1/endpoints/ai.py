from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_current_user
from app.services.gemini_service import GeminiService

router = APIRouter()

class ChatInput(BaseModel):
    message: str

@router.post("/chat")
async def chat_with_ai(chat_in: ChatInput, current_user: dict = Depends(get_current_user)):
    """
    Yêu cầu 2 & 3: Chat tương tác với AI, trả về tin nhắn kèm Mini-map card và Gợi ý nhanh
    """
    res = GeminiService.chat_response(chat_in.message, user_name=current_user["full_name"])
    return res
