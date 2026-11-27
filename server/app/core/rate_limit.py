"""In-memory sliding windows for login failures and password recovery requests."""
from __future__ import annotations

import time
from collections import OrderedDict, deque

from fastapi import HTTPException, status

MAX_FAILED_ATTEMPTS = 5
WINDOW_SECONDS = 15 * 60

Key = tuple[str, ...]
_attempts: OrderedDict[Key, deque[float]] = OrderedDict()


def _count(key: Key, now: float) -> int:
    cutoff = now - WINDOW_SECONDS
    # Keys are ordered by last insertion. Drop old identities even if they never return.
    while _attempts and next(iter(_attempts.values()))[-1] <= cutoff:
        _attempts.popitem(last=False)
    timestamps = _attempts.get(key)
    if timestamps is None:
        return 0
    while timestamps and timestamps[0] <= cutoff:
        timestamps.popleft()
    if not timestamps:
        del _attempts[key]
        return 0
    return len(timestamps)


def _record(key: Key, now: float) -> None:
    _attempts.setdefault(key, deque()).append(now)
    _attempts.move_to_end(key)


def _login_key(username: str, client_ip: str) -> Key:
    return ("login", username.strip().lower(), client_ip)


def check_login_rate_limit(username: str, client_ip: str) -> None:
    if _count(_login_key(username, client_ip), time.monotonic()) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "AUTH_RATE_LIMITED")


def record_login_failure(username: str, client_ip: str) -> None:
    key = _login_key(username, client_ip)
    now = time.monotonic()
    _count(key, now)
    _record(key, now)


def clear_login_failures(username: str, client_ip: str) -> None:
    _attempts.pop(_login_key(username, client_ip), None)


def reserve_attempt(scope: str, identity: str, ip: str, limit: int) -> float | None:
    """Reserve both windows before awaiting the database, even for concurrent requests."""
    now = time.monotonic()
    keys = ((scope, "identity", identity), (scope, "ip", ip))
    if any(_count(key, now) >= limit for key in keys):
        return None
    for key in keys:
        _record(key, now)
    return now


def release_attempt(scope: str, identity: str, ip: str, stamp: float) -> None:
    """A valid recovery proof does not count towards either failure limit."""
    for key in ((scope, "identity", identity), (scope, "ip", ip)):
        timestamps = _attempts.get(key)
        if timestamps and stamp in timestamps:
            timestamps.remove(stamp)
            if not timestamps:
                del _attempts[key]


def reset() -> None:
    _attempts.clear()
