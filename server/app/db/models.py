"""
models.py — SQLAlchemy ORM models (SQLite-compatible).
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase


def _new_id() -> str:
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String(32), primary_key=True, default=_new_id)
    username = Column(String(60), unique=True, nullable=False, index=True)
    hashed_password = Column(Text, nullable=False)
    full_name = Column(String(120), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class Trip(Base):
    __tablename__ = "trips"

    id = Column(String(32), primary_key=True, default=_new_id)
    user_id = Column(String(32), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    days = Column(Integer, nullable=False, default=1)
    budget = Column(Integer, nullable=False, default=5000000)
    total_estimated = Column(Integer, nullable=False, default=0)
    place_count = Column(Integer, nullable=False, default=0)
    places_per_day = Column(Integer, nullable=False, default=4)
    companion = Column(String(20), nullable=False, default="group")
    member_count = Column(Integer, nullable=False, default=4)
    transport_mode = Column(String(20), nullable=False, default="grab_bike")
    start_time = Column(String(10), nullable=False, default="08:00")
    end_time = Column(String(10), nullable=False, default="21:30")
    start_location = Column(String(200), nullable=False, default="Quận 1, TP. Hồ Chí Minh")
    preferences = Column(Text, nullable=False, default="[]")  # JSON array string
    special_notes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="completed")
    share_token = Column(String(64), unique=True, nullable=True, index=True)
    cover_photo = Column(Text, nullable=True)
    cover_place_name = Column(String(200), nullable=True)
    # Store full itinerary as JSON text for SQLite simplicity
    itinerary_json = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
