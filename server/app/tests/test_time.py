"""Tests for UTC naive datetime helper and tz-aware compatibility."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.db.models import PlaceCache
from app.utils.time import utc_now


def test_utc_now_is_naive_and_close_to_utc():
    now_naive = utc_now()
    now_aware = datetime.now(UTC)

    assert now_naive.tzinfo is None
    delta = abs(now_naive.replace(tzinfo=UTC) - now_aware)
    assert delta < timedelta(seconds=5)


def test_place_cache_is_expired_handles_aware_expires_at():
    entry = PlaceCache.create_entry("ChIJ_tz_test", {"rating": 4.5}, ttl_days=7)
    entry.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    assert entry.is_expired()

    entry.expires_at = datetime.now(UTC) + timedelta(minutes=5)
    assert not entry.is_expired()
