"""
user.py — Pydantic schemas for authentication & user management.
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    username: str = Field(..., max_length=64)
    password: str = Field(..., max_length=256)


class UserLogin(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    password: str


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------
class UserOut(BaseModel):
    id: str
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    token: str
    claimed_trips: int = 0
