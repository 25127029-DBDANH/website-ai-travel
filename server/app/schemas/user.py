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


class CurrentPasswordRequest(BaseModel):
    current_password: str


class ChangePasswordRequest(CurrentPasswordRequest):
    new_password: str


class RecoveryResetRequest(BaseModel):
    username: str
    recovery_code: str
    new_password: str


class EmailRequest(BaseModel):
    email: str


class VerifyEmailRequest(BaseModel):
    code: str


class TokenResetRequest(BaseModel):
    token: str
    new_password: str


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., min_length=1, max_length=4096)


class DeleteAccountRequest(BaseModel):
    password: str | None = None
    id_token: str | None = Field(None, max_length=4096)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------
class UserOut(BaseModel):
    id: str
    username: str
    email: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
    has_password: bool
    has_recovery_code: bool
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    token: str
    claimed_trips: int = 0
    recovery_code: str | None = None
