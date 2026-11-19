"""
models.py — SQLAlchemy ORM models (compatible with SQLite & PostgreSQL).
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)

Design constraints:
  - Use String(36) instead of UUID   → SQLite compatible
  - Use Text + json.dumps for arrays → no PostgreSQL ARRAY type
  - Use String(10) for time fields   → 'HH:MM' format, no TIME type
  - Avoid server_default=func.now()  → use Python-side defaults

Tables created by Base.metadata.create_all():
  users, trips, places, places_cache
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import (
    Boolean, DateTime, Float, Integer,
    String, Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


# ---------------------------------------------------------------------------
# Shared declarative base (imported by session.py)
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Helper: generate UUID string
# ---------------------------------------------------------------------------
def _uuid() -> str:
    return str(uuid4())


# ---------------------------------------------------------------------------
# TABLE: users  (owned by Thành viên 2 — Khang; stub defined here so
#                Base.metadata.create_all() creates the table on first run)
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(120))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


# ---------------------------------------------------------------------------
# TABLE: trips  (owned by Thành viên 4 — Lam & Thành viên 6 — Hao; stub)
# ---------------------------------------------------------------------------
class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    num_days: Mapped[int] = mapped_column(Integer, default=1)
    district_focus: Mapped[str | None] = mapped_column(String(60))
    budget_per_day: Mapped[int | None] = mapped_column(Integer)
    # JSON arrays stored as Text
    travel_styles: Mapped[str] = mapped_column(Text, default="[]")
    num_travelers: Mapped[int] = mapped_column(Integer, default=1)
    transport_mode: Mapped[str] = mapped_column(String(20), default="motorbike")
    pace: Mapped[str] = mapped_column(String(20), default="moderate")
    special_notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    calendar_synced: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_rating: Mapped[int | None] = mapped_column(Integer)
    ai_rating_note: Mapped[str | None] = mapped_column(Text)
    itinerary_json: Mapped[str | None] = mapped_column(Text)  # full AI output
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


# ---------------------------------------------------------------------------
# TABLE: places  (owned by Thành viên 3 — Đạt)
# ---------------------------------------------------------------------------
class Place(Base):
    """
    Represents a real HCMC location (tourist spot, restaurant, café, etc.).

    Field notes:
      tags       : JSON array string  e.g. '["check-in", "ẩm thực"]'
      open_time  : 'HH:MM' string     e.g. '08:00'
      close_time : 'HH:MM' string     e.g. '22:00'
      is_indoor  : True → indoor (museum, mall, restaurant…)
                   False → outdoor (park, street, landmark…)
                   Used by contingency_service for rainy-day re-routing.
    """
    __tablename__ = "places"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_vi: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(Text, nullable=False)
    district: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    # category: attraction | food | cafe | culture | shopping | park | entertainment
    category: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    is_indoor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    open_time: Mapped[str | None] = mapped_column(String(10))   # 'HH:MM'
    close_time: Mapped[str | None] = mapped_column(String(10))  # 'HH:MM'
    entry_fee_vnd: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_rating: Mapped[float | None] = mapped_column(Float)
    google_place_id: Mapped[str | None] = mapped_column(String(100))
    photo_url: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON array string
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # ── Convenience helpers ───────────────────────────────────────────────
    def tags_list(self) -> list[str]:
        """Deserialise the JSON tags field."""
        try:
            return json.loads(self.tags or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "name_vi": self.name_vi,
            "address": self.address,
            "district": self.district,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "is_indoor": self.is_indoor,
            "open_time": self.open_time,
            "close_time": self.close_time,
            "entry_fee_vnd": self.entry_fee_vnd,
            "average_rating": self.average_rating,
            "google_place_id": self.google_place_id,
            "photo_url": self.photo_url,
            "description": self.description,
            "tags": self.tags_list(),
            "is_active": self.is_active,
        }


# ---------------------------------------------------------------------------
# TABLE: places_cache  (owned by Thành viên 3 — Đạt)
# Cache external Google Places API responses with a 7-day TTL.
# ---------------------------------------------------------------------------
class PlaceCache(Base):
    __tablename__ = "places_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    place_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    data_json: Mapped[str] = mapped_column(Text, nullable=False)  # cached JSON
    cached_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    @classmethod
    def create_entry(cls, place_id: str, data: dict, ttl_days: int = 7) -> PlaceCache:
        now = datetime.utcnow()
        return cls(
            place_id=place_id,
            data_json=json.dumps(data, ensure_ascii=False),
            cached_at=now,
            expires_at=now + timedelta(days=ttl_days),
        )

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def to_data(self) -> dict:
        try:
            return json.loads(self.data_json)
        except (json.JSONDecodeError, TypeError):
            return {}
