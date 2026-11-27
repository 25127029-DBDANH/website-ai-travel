"""Detailed trip interests shared by catalog ranking and the place counter."""

from __future__ import annotations

import json
import unicodedata
from collections.abc import Mapping, Sequence
from contextvars import ContextVar
from functools import lru_cache
from typing import TYPE_CHECKING, Any, TypedDict

if TYPE_CHECKING:
    from app.schemas.ai import PlaceResponse


# The existing AI projection passes only the display category to PlaceResponse.
# Carry the two original fields across that projection within the current request.
_catalog_fields: ContextVar[dict[str, dict[str, Any]]] = ContextVar("catalog_interest_fields")


def remember_catalog_fields(rows: list[dict[str, Any]]) -> None:
    _catalog_fields.set({
        row["id"]: {"catalog_category": row["category"], "tags": row["tags"]}
        for row in rows
    })


def catalog_fields_for(place_id: str) -> dict[str, Any]:
    return _catalog_fields.get({}).get(place_id, {})


class InterestDefinition(TypedDict):
    label: str
    categories: tuple[str, ...]
    tags: tuple[str, ...]
    legacy: tuple[str, ...]


INTEREST_DEFINITIONS: dict[str, InterestDefinition] = {
    "street_food": InterestDefinition(
        label="Ăn vặt đường phố", categories=("food",), legacy=("food",),
        tags=("vỉa hè", "bình dân", "ốc", "bánh mì", "hủ tiếu", "phở", "ăn vặt"),
    ),
    "local_classics": InterestDefinition(
        label="Quán lâu đời & đặc sản", categories=("food",), legacy=("food",),
        tags=("đặc sản", "nổi tiếng", "gia truyền", "miền Nam", "lâu đời"),
    ),
    "seafood_nhau": InterestDefinition(
        label="Hải sản & nhậu", categories=("food",), legacy=("food", "nightlife"),
        tags=("hải sản", "ốc", "nhậu", "nướng"),
    ),
    "cafe_hopping": InterestDefinition(
        label="Cà phê đẹp", categories=("cafe",), legacy=("cafe",),
        tags=("check-in", "sân vườn", "view", "view sông"),
    ),
    "coffee_retro": InterestDefinition(
        label="Cà phê chill, retro", categories=("cafe",), legacy=("cafe",),
        tags=("vintage", "yên tĩnh", "độc đáo", "thư giãn"),
    ),
    "rooftop_night": InterestDefinition(
        label="Rooftop & ngắm thành phố", categories=("cafe", "entertainment", "attraction"),
        legacy=("nightlife",), tags=("rooftop", "view", "sang trọng", "buổi tối"),
    ),
    "nightlife_street": InterestDefinition(
        label="Phố đêm & bar", categories=("entertainment", "food"), legacy=("nightlife",),
        tags=("buổi tối", "dạo phố", "giới trẻ", "nhậu"),
    ),
    "french_architecture": InterestDefinition(
        label="Kiến trúc Pháp", categories=("attraction", "culture"), legacy=("culture",),
        tags=("kiến trúc", "di sản"),
    ),
    "temples_churches": InterestDefinition(
        label="Chùa, đình, nhà thờ", categories=("culture",), legacy=("culture",),
        tags=("tôn giáo",),
    ),
    "museums_art": InterestDefinition(
        label="Bảo tàng & nghệ thuật", categories=("culture",), legacy=("culture",),
        tags=("bảo tàng", "nghệ thuật", "triển lãm"),
    ),
    "history": InterestDefinition(
        label="Lịch sử & chiến tranh", categories=("culture", "attraction"), legacy=("culture",),
        tags=("lịch sử", "chiến tranh", "di sản"),
    ),
    "markets": InterestDefinition(
        label="Chợ & mua sắm địa phương", categories=("shopping",), legacy=("shopping",),
        tags=("chợ", "mua sắm"),
    ),
    "riverside": InterestDefinition(
        label="Sông nước & hoàng hôn", categories=("park", "attraction"), legacy=("nature",),
        tags=("ven sông", "view sông"),
    ),
    "parks": InterestDefinition(
        label="Công viên cây xanh", categories=("park",), legacy=("nature",),
        tags=("cây xanh", "công viên"),
    ),
    "photo_spots": InterestDefinition(
        label="Check-in sống ảo", categories=("attraction", "cafe"), legacy=("culture",),
        tags=("check-in",),
    ),
    "local_life": InterestDefinition(
        label="Đời sống địa phương", categories=("attraction", "food"), legacy=("culture",),
        tags=("dạo phố", "địa phương", "bình dân"),
    ),
    "chinatown": InterestDefinition(
        label="Chợ Lớn – người Hoa", categories=("culture", "food"), legacy=("culture", "food"),
        tags=("Chợ Lớn", "người Hoa"),
    ),
    "family_fun": InterestDefinition(
        label="Vui chơi cho bé", categories=("entertainment", "park"), legacy=("nature",),
        tags=("gia đình", "vui chơi"),
    ),
}


@lru_cache(maxsize=1024)
def _fold(text: str) -> str:
    letters = unicodedata.normalize("NFD", text.casefold().replace("đ", "d"))
    return "".join(ch for ch in letters if not unicodedata.combining(ch)).strip()


def interest_score(place: Mapping[str, Any] | PlaceResponse, interests: Sequence[str]) -> float:
    """Count distinct matching interests, with a half-point bonus for category and tag."""
    if isinstance(place, Mapping):
        category = place.get("category") or ""
        raw = place.get("tags") or []
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except json.JSONDecodeError:
                pass  # Older rows can contain plain text instead of a JSON array.
        if isinstance(raw, str):
            raw = [raw]
        tags = raw if isinstance(raw, (list, tuple)) else []
    else:
        category = place.catalog_category or place.category
        tags = place.tags
    folded_tags = [_fold(tag) for tag in tags if isinstance(tag, str)]
    score = 0.0
    for key in dict.fromkeys(interests):
        definition = INTEREST_DEFINITIONS.get(key)
        if definition is None:
            continue
        category_match = category.casefold() in definition["categories"]
        tag_match = any(
            _fold(keyword) in tag for keyword in definition["tags"] for tag in folded_tags
        )
        if category_match or tag_match:
            score += 1.5 if category_match and tag_match else 1.0
    return score


def matches_any(place: Mapping[str, Any] | PlaceResponse, interests: Sequence[str]) -> bool:
    return interest_score(place, interests) > 0


def legacy_preferences(interests: Sequence[str]) -> list[str]:
    """Return the union of legacy preferences, in the order selected on the form."""
    preferences = (
        pref
        for key in interests if key in INTEREST_DEFINITIONS
        for pref in INTEREST_DEFINITIONS[key]["legacy"]
    )
    return list(dict.fromkeys(preferences))
