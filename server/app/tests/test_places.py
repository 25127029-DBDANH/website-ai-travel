"""
test_places.py — Automated tests for Places ORM models, dataset & service logic.
Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
"""

from __future__ import annotations

import re
from datetime import timedelta
from pathlib import Path
from typing import Any

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.hcmc_data import _BT, _PN, _Q1, _Q3, _Q4, _Q5, _Q7, _TD, PLACES
from app.utils.time import utc_now


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
    """Verify required fields, coordinates, opening hours, and photo URLs."""
    categories = {"attraction", "culture", "food", "cafe", "shopping", "park", "entertainment"}

    for p in PLACES:
        assert p["name"], "Place name is required"
        assert p["address"], f"Address missing for {p['name']}"
        assert p["district"], f"District missing for {p['name']}"
        assert 10.0 <= p["latitude"] <= 11.5, f"Invalid latitude for {p['name']}: {p['latitude']}"
        assert 106.0 <= p["longitude"] <= 107.5, (
            f"Invalid longitude for {p['name']}: {p['longitude']}"
        )
        assert p["category"] in categories, f"Invalid category for {p['name']}: {p['category']}"
        assert isinstance(p["is_indoor"], bool), f"is_indoor must be bool for {p['name']}"
        assert p["open_time"] and len(p["open_time"]) == 5, f"Invalid open_time for {p['name']}"
        assert p["close_time"] and len(p["close_time"]) == 5, f"Invalid close_time for {p['name']}"
        assert p["photo_url"] and (
            p["photo_url"].startswith("http") or p["photo_url"].startswith("/images/")
        ), f"Missing or invalid photo_url for {p['name']}"
        assert isinstance(p["photo_is_generic"], bool), (
            f"photo_is_generic must be bool for {p['name']}"
        )
        assert p["tags"] and p["tags"].startswith("["), f"Tags must be JSON string for {p['name']}"

    names = [p["name"] for p in PLACES]
    assert len(names) == len(set(names)), "Duplicate place names found in PLACES"
    for p in _Q3:
        assert not re.search(r"(?<!\d)Quận 1(?!\d)", p["address"]), (
            f"Quận 3 entry {p['name']} has Quận 1 address: {p['address']}"
        )


def test_places_food_and_cafe_realistic_data():
    """Ensure all food & cafe spots have realistic non-zero costs and proper indoor flags."""
    outdoor_keywords = (
        "chợ đêm",
        "vỉa hè",
        "xe đẩy",
        "lộ thiên",
        "công viên",
        "bờ kè",
        "lề đường",
    )
    for p in PLACES:
        if p["category"] in ("food", "cafe"):
            assert p["entry_fee_vnd"] > 0, (
                f"{p['name']} ({p['category']}) must have realistic price > 0 VND, not free"
            )
            lower_context = f"{p['name']} {p['name_vi']} {p['description']}".lower()
            if not any(kw in lower_context for kw in outdoor_keywords):
                assert p["is_indoor"] is True, (
                    f"{p['name']} ({p['category']}) is a shop and must have is_indoor=True"
                )


def test_banh_mi_huynh_hoa_realistic_details():
    """
    Regression test for Issue #36 & PR #48 review:
    - Bánh Mì Huỳnh Hoa uses dish illustration (/images/banh-mi.png, photo_is_generic=True),
      is_indoor=True, entry_fee_vnd=65000, open 06:00-22:00.
    - Phở Hòa Pasteur belongs to Quận 3 (260C Pasteur), 06:00-23:00, 90k VND.
    - Ben Thanh Market & Bach Dang Wharf Park exist.
    - Verified landmarks have photo_is_generic=False.
    """
    by_name = {p["name"]: p for p in PLACES}
    huynh_hoa = by_name.get("Banh Mi Huynh Hoa")
    assert huynh_hoa is not None, "Bánh Mì Huỳnh Hoa not found in PLACES"
    assert huynh_hoa["is_indoor"] is True
    assert huynh_hoa["entry_fee_vnd"] == 65000
    assert huynh_hoa["open_time"] == "06:00"
    assert huynh_hoa["close_time"] == "22:00"
    assert huynh_hoa["photo_url"] == "/images/banh-mi.png"
    assert huynh_hoa["photo_is_generic"] is True

    pho_hoa = by_name.get("Pho Hoa Pasteur")
    assert pho_hoa is not None
    assert pho_hoa["district"] == "Quận 3"
    assert pho_hoa["entry_fee_vnd"] == 90000
    assert pho_hoa["is_indoor"] is True

    for q1_name in ("Banh Xeo 46A", "Emperor Jade Pagoda", "Com Tam 3A"):
        q1_place = by_name.get(q1_name)
        assert q1_place is not None, f"{q1_name} must exist in dataset"
        assert q1_place["district"] == "Quận 1", f"{q1_name} must belong to Quận 1"

    verified_landmarks = (
        "Notre-Dame Cathedral Basilica of Saigon",
        "Reunification Palace",
        "Nguyen Hue Walking Street",
        "Bach Dang Wharf Park",
        "Saigon Waterbus Bach Dang",
        "Ben Thanh Market",
        "War Remnants Museum",
    )
    for landmark in verified_landmarks:
        p = by_name.get(landmark)
        assert p is not None, f"{landmark} must exist in dataset"
        assert p["photo_is_generic"] is False, f"{landmark} must have photo_is_generic=False"


def test_place_model_to_dict_includes_photo_is_generic():
    """Verify Place ORM model includes photo_is_generic in to_dict() output."""
    from app.db.models import Place

    place = Place(
        name="Test Place",
        name_vi="Địa điểm Test",
        address="123 Test St",
        district="Quận 1",
        latitude=10.77,
        longitude=106.70,
        category="attraction",
        is_indoor=True,
        open_time="08:00",
        close_time="17:00",
        entry_fee_vnd=50000,
        average_rating=4.5,
        photo_url="/images/notre-dame.jpg",
        photo_is_generic=False,
    )
    d = place.to_dict()
    assert d["photo_is_generic"] is False


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
    entry.expires_at = utc_now() - timedelta(minutes=1)
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
        f"Route /photo (index {photo_idx}) must precede /{{place_id}} (index {place_id_idx}) "
        f"to prevent route shadowing (Issue #20)!"
    )


def test_photo_endpoint_resolution_not_404_place():
    """
    Regression test for Issue #20:
    Calling the photo route must not be captured as a place ID lookup.
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


@pytest.mark.asyncio
async def test_legacy_schema_migration_and_seed_upsert(tmp_path: Path) -> None:
    """
    Ensure ensure_schema() adds places.photo_is_generic cleanly on legacy DBs,
    seed_places() updates existing records by name while preserving primary keys,
    and search_places() succeeds without 500 OperationalError.
    """
    from sqlalchemy import inspect, text
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.db.hcmc_data import seed_places
    from app.db.migrations import ensure_schema
    from app.services.places_service import count_places, search_places

    db_file = tmp_path / "legacy_places.db"
    legacy_engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    session_factory = async_sessionmaker(legacy_engine, expire_on_commit=False)

    try:
        async with legacy_engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    CREATE TABLE places (
                        id VARCHAR(36) PRIMARY KEY,
                        name VARCHAR(200) NOT NULL,
                        name_vi VARCHAR(200),
                        address TEXT NOT NULL,
                        district VARCHAR(60) NOT NULL,
                        latitude FLOAT NOT NULL,
                        longitude FLOAT NOT NULL,
                        category VARCHAR(60) NOT NULL,
                        is_indoor BOOLEAN NOT NULL,
                        open_time VARCHAR(10),
                        close_time VARCHAR(10),
                        entry_fee_vnd INTEGER NOT NULL,
                        average_rating FLOAT,
                        google_place_id VARCHAR(100),
                        photo_url TEXT,
                        description TEXT,
                        tags TEXT NOT NULL,
                        is_active BOOLEAN NOT NULL,
                        created_at DATETIME
                    )
                    """
                )
            )
            await conn.execute(
                text(
                    """
                    INSERT INTO places (
                        id, name, name_vi, address, district, latitude, longitude,
                        category, is_indoor, open_time, close_time, entry_fee_vnd,
                        average_rating, photo_url, description, tags, is_active
                    ) VALUES
                    (
                        'legacy-hh-id', 'Banh Mi Huynh Hoa', 'Bánh Mì Huỳnh Hoa',
                        '26 Le Thi Rieng', 'Quận 1', 10.768, 106.6919,
                        'food', 0, '14:30', '23:30', 0,
                        4.5, '/images/old.jpg', 'Old desc', '[]', 1
                    ),
                    (
                        'legacy-bt-old', 'Ben Thanh Market Food Area', 'Khu Ẩm Thực Chợ Bến Thành',
                        'Lê Lợi, Quận 1', 'Quận 1', 10.7726, 106.6982,
                        'food', 1, '06:00', '18:00', 0,
                        4.1, 'https://images.unsplash.com/photo-1626132627393-83f4a9f0dfa8',
                        'Old stall', '[]', 1
                    ),
                    (
                        'legacy-pp-old', 'Pho Pasteur Q3', 'Phở Pasteur',
                        '260C Pasteur, Quận 3', 'Quận 3', 10.7871, 106.6892,
                        'food', 1, '06:00', '22:00', 0,
                        4.4, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
                        'Old pho', '[]', 1
                    )
                    """
                )
            )

        async with legacy_engine.begin() as conn:
            await ensure_schema(conn)
            await ensure_schema(conn)  # verify idempotency
            cols = await conn.run_sync(
                lambda sc: {c["name"] for c in inspect(sc).get_columns("places")}
            )
            assert "photo_is_generic" in cols
            default_flag = (
                await conn.execute(
                    text("SELECT photo_is_generic FROM places WHERE id = 'legacy-hh-id'")
                )
            ).scalar_one()
            assert bool(default_flag) is True

        async with session_factory() as session:
            await seed_places(session=session)
            # Run a second time to verify idempotency when no rows need updating
            await seed_places(session=session)

        async with legacy_engine.connect() as conn:
            deactivated_rows = (
                await conn.execute(
                    text(
                        "SELECT id, is_active FROM places "
                        "WHERE id IN ('legacy-bt-old', 'legacy-pp-old')"
                    )
                )
            ).fetchall()
            assert len(deactivated_rows) == 2
            for _row_id, active_flag in deactivated_rows:
                assert bool(active_flag) is False

        async with session_factory() as session:
            assert await count_places(session) == len(PLACES)

            results = await search_places(session, q="Huynh Hoa")
            assert len(results) >= 1
            hh = next(item for item in results if item["name"] == "Banh Mi Huynh Hoa")
            assert hh["id"] == "legacy-hh-id"
            assert hh["photo_is_generic"] is True
            assert hh["entry_fee_vnd"] == 65000
            assert hh["is_indoor"] is True
            assert hh["open_time"] == "06:00"
            assert hh["close_time"] == "22:00"
            assert hh["photo_url"] == "/images/banh-mi.png"

            ben_thanh_results = await search_places(session, q="Ben Thanh")
            ben_thanh_names = {item["name"] for item in ben_thanh_results}
            assert "Ben Thanh Market Food Area" not in ben_thanh_names
            assert "Ben Thanh Market" in ben_thanh_names

            pasteur_results = await search_places(session, q="Pasteur")
            pasteur_names = {item["name"] for item in pasteur_results}
            assert "Pho Pasteur Q3" not in pasteur_names
            assert "Pho Hoa Pasteur" in pasteur_names
    finally:
        await legacy_engine.dispose()


@pytest.mark.asyncio
async def test_search_places_pagination_returns_exact_filtered_total(
    client: httpx.AsyncClient,
    test_database: tuple[Any, async_sessionmaker[AsyncSession]],
) -> None:
    """
    Regression test for Issue #36 pagination bug:
    GET /api/v1/places/search?limit=5 must return total matching count via COUNT(*),
    not len(results) truncated by LIMIT, and exclude inactive places.
    """
    from app.db.models import Place

    _, session_factory = test_database
    async with session_factory() as session:
        for i in range(12):
            session.add(
                Place(
                    name=f"Q1 Place {i:02d}",
                    name_vi=f"Địa điểm Q1 {i:02d}",
                    address=f"{i + 1} Nguyễn Huệ, Quận 1",
                    district="Quận 1",
                    latitude=10.774 + i * 0.0001,
                    longitude=106.702,
                    category="attraction",
                    is_indoor=False,
                    entry_fee_vnd=0,
                    average_rating=4.5,
                    photo_url="https://example.com/a.jpg",
                    photo_is_generic=True,
                )
            )
        for i in range(3):
            session.add(
                Place(
                    name=f"Q3 Food {i:02d}",
                    name_vi=f"Quán Q3 {i:02d}",
                    address=f"{i + 1} Pasteur, Quận 3",
                    district="Quận 3",
                    latitude=10.785,
                    longitude=106.690,
                    category="food",
                    is_indoor=True,
                    entry_fee_vnd=60000,
                    average_rating=4.3,
                    photo_url="https://example.com/b.jpg",
                    photo_is_generic=True,
                )
            )
        session.add(
            Place(
                name="Inactive Q1 Spot",
                name_vi="Điểm đóng cửa",
                address="00 Nguyễn Huệ, Quận 1",
                district="Quận 1",
                latitude=10.774,
                longitude=106.702,
                category="attraction",
                is_indoor=False,
                entry_fee_vnd=0,
                is_active=False,
                photo_url="https://example.com/c.jpg",
                photo_is_generic=True,
            )
        )
        await session.commit()

    resp_all = await client.get("/api/v1/places/search?limit=5&offset=0")
    assert resp_all.status_code == 200, resp_all.text
    body_all = resp_all.json()
    assert len(body_all["results"]) == 5
    assert body_all["total"] == 15

    resp_q1 = await client.get("/api/v1/places/search?district=Quận 1&limit=4&offset=8")
    assert resp_q1.status_code == 200, resp_q1.text
    body_q1 = resp_q1.json()
    assert len(body_q1["results"]) == 4
    assert body_q1["total"] == 12

    resp_beyond = await client.get("/api/v1/places/search?limit=5&offset=100")
    assert resp_beyond.status_code == 200, resp_beyond.text
    body_beyond = resp_beyond.json()
    assert body_beyond["results"] == []
    assert body_beyond["total"] == 15

    resp_ready = await client.get("/health/ready")
    assert resp_ready.status_code == 200, resp_ready.text
    assert resp_ready.json()["places"] == 15
