"""
models.py — Unified SQLAlchemy ORM models (compatible with SQLite & PostgreSQL).
Authors :
  - Đỗ Nguyễn An Khang (Backend Lead & Auth Service): User, Trip
  - Ngô Tấn Đạt (Database & Data Engineer): Place, PlaceCache

Tables created by Base.metadata.create_all():
  users, trips, places, places_cache
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _new_id() -> str:
    return uuid.uuid4().hex


def _uuid() -> str:
    return str(uuid4())


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# TABLE: users  (Đỗ Nguyễn An Khang — Auth Service)
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(String(32), primary_key=True, default=_new_id)
    username = Column(String(60), unique=True, nullable=False, index=True)
    email = Column(String(254), nullable=True, index=True)
    google_sub = Column(String(64), nullable=True, unique=True, index=True)
    hashed_password = Column(Text, nullable=False)
    full_name = Column(String(120), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    @property
    def has_password(self) -> bool:
        from app.core.security import is_usable_password

        return is_usable_password(self.hashed_password)


# ---------------------------------------------------------------------------
# TABLE: trips  (Đỗ Nguyễn An Khang — Trip CRUD Service)
# ---------------------------------------------------------------------------
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
    itinerary_json = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# TABLE: places  (Ngô Tấn Đạt — Places & Interactive Map)
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
    """
    __tablename__ = "places"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_vi: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(Text, nullable=False)
    district: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    is_indoor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    open_time: Mapped[str | None] = mapped_column(String(10))
    close_time: Mapped[str | None] = mapped_column(String(10))
    entry_fee_vnd: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_rating: Mapped[float | None] = mapped_column(Float)
    google_place_id: Mapped[str | None] = mapped_column(String(100))
    photo_url: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[str] = mapped_column(Text, default="[]")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

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
# TABLE: places_cache  (Ngô Tấn Đạt — 7-day TTL Cache)
# ---------------------------------------------------------------------------
class PlaceCache(Base):
    __tablename__ = "places_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    place_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    data_json: Mapped[str] = mapped_column(Text, nullable=False)
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
