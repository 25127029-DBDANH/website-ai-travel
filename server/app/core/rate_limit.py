"""In-memory sliding-window rate limiter for failed login attempts."""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, status

MAX_FAILED_ATTEMPTS = 5
WINDOW_SECONDS = 15 * 60

_attempts: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def _make_key(username: str, client_ip: str) -> tuple[str, str]:
    return (username.strip().lower(), client_ip)


def _prune(timestamps: deque[float], now: float) -> None:
    cutoff = now - WINDOW_SECONDS
    while timestamps and timestamps[0] <= cutoff:
        timestamps.popleft()


def check_login_rate_limit(username: str, client_ip: str) -> None:
    """Raise HTTP 429 if the (username, ip) pair reached the failure limit."""
    key = _make_key(username, client_ip)
    timestamps = _attempts.get(key)
    if not timestamps:
        return

    now = time.monotonic()
    _prune(timestamps, now)
    if not timestamps:
        _attempts.pop(key, None)
        return

    if len(timestamps) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AUTH_RATE_LIMITED",
        )


def record_login_failure(username: str, client_ip: str) -> None:
    """Record a failed login attempt for the (username, ip) pair."""
    key = _make_key(username, client_ip)
    now = time.monotonic()
    timestamps = _attempts[key]
    _prune(timestamps, now)
    timestamps.append(now)


def clear_login_failures(username: str, client_ip: str) -> None:
    """Clear failed login attempts after a successful login."""
    _attempts.pop(_make_key(username, client_ip), None)


def reset() -> None:
    """Clear all rate-limit counters (used by tests)."""
    _attempts.clear()
