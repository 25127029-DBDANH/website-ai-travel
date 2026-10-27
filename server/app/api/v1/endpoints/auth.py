from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserResponse, PreferenceUpdate
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserRegister):
    token = create_access_token(subject=user_in.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": "mock-uuid-1234",
            "email": user_in.email,
            "full_name": user_in.full_name,
            "avatar_url": None
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserLogin):
    token = create_access_token(subject=user_in.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": "mock-uuid-1234",
            "email": user_in.email,
            "full_name": "Du Khách Sài Gòn",
            "avatar_url": None
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": "user@example.com",
        "full_name": "Du Khách Sài Gòn",
        "avatar_url": None
    }

@router.get("/preferences")
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    """Lấy sở thích cũ để điền trước form cho Returning User (Yêu cầu 7)"""
    return {
        "favorite_districts": ["Quận 1", "Quận 3"],
        "preferred_categories": ["ẩm thực", "cafe", "di tích"],
        "budget_level": "Trung bình",
        "transportation_mode": "Xe máy"
    }
