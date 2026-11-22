"""
test_places.py — Automated tests for Places ORM models, dataset & service logic.
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

from app.db.hcmc_data import PLACES, _Q1, _Q3, _Q4, _Q5, _BT, _PN, _TD, _Q7


def test_places_count_and_distribution():
    """Verify minimum 320+ places total and 40+ places per district across 8 districts."""
    assert len(PLACES) >= 320, f"Expected >= 320 places, got {len(PLACES)}"
    assert len(_Q1) >= 40, f"Quận 1 expected >= 40, got {len(_Q1)}"
    assert len(_Q3) >= 40, f"Quận 3 expected >= 40, got {len(_Q3)}"
    assert len(_Q4) >= 40, f"Quận 4 expected >= 40, got {len(_Q4)}"
    assert len(_Q5) >= 40, f"Quận 5 expected >= 40, got {len(_Q5)}"
    assert len(_BT) >= 40, f"Bình Thạnh expected >= 40, got {len(_BT)}"
    assert len(_PN) >= 40, f"Phú Nhuận expected >= 40, got {len(_PN)}"
    assert len(_TD) >= 40, f"Thủ Đức expected >= 40, got {len(_TD)}"
    assert len(_Q7) >= 40, f"Quận 7 expected >= 40, got {len(_Q7)}"


def test_places_required_fields():
    """Verify 100% of places have required fields including valid photo_url, coordinates, and hours."""
    categories = {"attraction", "culture", "food", "cafe", "shopping", "park", "entertainment"}

    for p in PLACES:
        assert p["name"], "Place name is required"
        assert p["address"], f"Address missing for {p['name']}"
        assert p["district"], f"District missing for {p['name']}"
        assert 10.0 <= p["latitude"] <= 11.5, f"Invalid latitude for {p['name']}: {p['latitude']}"
        assert 106.0 <= p["longitude"] <= 107.5, f"Invalid longitude for {p['name']}: {p['longitude']}"
        assert p["category"] in categories, f"Invalid category for {p['name']}: {p['category']}"
        assert isinstance(p["is_indoor"], bool), f"is_indoor must be bool for {p['name']}"
        assert p["open_time"] and len(p["open_time"]) == 5, f"Invalid open_time for {p['name']}"
        assert p["close_time"] and len(p["close_time"]) == 5, f"Invalid close_time for {p['name']}"
        assert p["photo_url"] and p["photo_url"].startswith("http"), f"Missing or invalid photo_url for {p['name']}"
        assert p["tags"] and p["tags"].startswith("["), f"Tags must be JSON string for {p['name']}"


def test_haversine_distance():
    """Verify Haversine distance calculation and boundary clamping."""
    from app.services.places_service import _haversine_distance_km

    # Distance between Ben Thanh Market (10.7725, 106.6980) and Notre Dame (10.7798, 106.6990)
    d = _haversine_distance_km(10.7725, 106.6980, 10.7798, 106.6990)
    assert 0.7 <= d <= 1.0, f"Expected ~0.8 km, got {d}"

    # Distance to self must be 0.0 without precision error
    d_self = _haversine_distance_km(10.7725, 106.6980, 10.7725, 106.6980)
    assert d_self == 0.0


def test_place_cache_ttl():
    """Verify PlaceCache TTL calculation and expiration check."""
    from app.db.models import PlaceCache

    entry = PlaceCache.create_entry("ChIJ_test123", {"rating": 4.8}, ttl_days=7)
    assert not entry.is_expired()
    assert entry.to_data()["rating"] == 4.8

    # Simulate expired entry
    entry.expires_at = datetime.utcnow() - timedelta(minutes=1)
    assert entry.is_expired()


def test_photo_route_not_shadowed_by_place_id():
    """
    Regression test for Issue #20:
    Ensure GET /photo is registered BEFORE GET /{place_id} in router.routes
    so that /places/photo is never captured with place_id="photo".
    """
    from app.api.v1.endpoints.places import router

    photo_idx = None
    place_id_idx = None
    for idx, route in enumerate(router.routes):
        path = getattr(route, "path", None)
        if path and path.endswith("/photo"):
            photo_idx = idx
        elif path and path.endswith("/{place_id}"):
            place_id_idx = idx

    assert photo_idx is not None, "Route /photo not found in places router"
    assert place_id_idx is not None, "Route /{place_id} not found in places router"
    assert photo_idx < place_id_idx, (
        f"Route /photo (index {photo_idx}) must precede /{place_id} (index {place_id_idx}) "
        f"to prevent route shadowing (Issue #20)!"
    )


def test_photo_endpoint_resolution_not_404_place():
    """
    Regression test for Issue #20:
    Calling GET /api/v1/places/photo?name=test must NOT return 404 'Không tìm thấy địa điểm với id=photo'.
    Without Google API key, it should safely enter proxy_google_place_photo and return 503.
    """
    from fastapi import FastAPI
    from starlette.testclient import TestClient
    from app.api.v1.endpoints.places import router

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    client = TestClient(app)

    resp = client.get("/api/v1/places/photo?name=test_photo")
    # Must NOT be 404 place not found
    assert "Không tìm thấy địa điểm với id=photo" not in resp.text
    # Without GOOGLE_PLACES_API_KEY, it correctly reaches the handler and returns 503
    assert resp.status_code == 503
    assert "Google Places API key chưa được cấu hình" in resp.json()["detail"]

