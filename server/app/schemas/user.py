from pydantic import BaseModel
from typing import Optional, List

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PreferenceUpdate(BaseModel):
    favorite_districts: Optional[List[str]] = []
    preferred_categories: Optional[List[str]] = []
    budget_level: Optional[str] = "Trung bình"
    transportation_mode: Optional[str] = "Xe máy"
    dietary_notes: Optional[str] = None
