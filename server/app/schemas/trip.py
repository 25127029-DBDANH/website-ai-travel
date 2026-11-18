"""
trip.py — Pydantic schemas for trip management.
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------
class TripCreate(BaseModel):
    title: str = Field(default="Khám phá Sài Gòn")
    days: int = Field(default=1, ge=1, le=14)
    budget: int | None = None
    places_per_day: int = Field(default=4, ge=3, le=6)
    companion: str = "group"
    member_count: int = Field(default=4, ge=1)
    transport_mode: str = "grab_bike"
    start_time: str = "08:00"
    end_time: str = "21:30"
    start_location: str = "Quận 1, TP. Hồ Chí Minh"
    preferences: list[str] = Field(default_factory=lambda: ["food", "culture"])
    special_notes: str | None = None
    # Full itinerary items array from AI or form generation
    itinerary_items: list[dict[str, Any]] = Field(default_factory=list)


class TripUpdate(BaseModel):
    title: str | None = None
    status: str | None = None


class TripItemUpdate(BaseModel):
    visited: bool | None = None
    photo_url: str | None = None
    note: str | None = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------
class TripOut(BaseModel):
    id: str
    title: str
    days: int
    budget: int
    total_estimated: int = 0
    place_count: int = 0
    status: str = "completed"
    created_at: datetime
    is_shared: bool = False
    cover_photo: str | None = None
    cover_place_name: str | None = None

    model_config = {"from_attributes": True}


class BudgetSummary(BaseModel):
    total_budget: int = 0
    total_estimated: int = 0
    activities_cost: int = 0
    transit_cost: int = 0
    member_count: int = 1
    per_person_estimated: int = 0
    percentage: int = 0
    health: str = "under_budget"


class TripDetailOut(BaseModel):
    trip: TripOut
    itinerary_items: list[dict[str, Any]] = Field(default_factory=list)
    budget_summary: BudgetSummary = Field(default_factory=BudgetSummary)


class TripListOut(BaseModel):
    trips: list[TripOut]


class ShareResponse(BaseModel):
    token: str
    share_url: str


class CloneResponse(BaseModel):
    id: str
    trip: TripOut
