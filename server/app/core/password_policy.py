"""Password and username validation rules (NIST SP 800-63B-4 / GitHub-style)."""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path

from fastapi import HTTPException, status

_COMMON_PASSWORDS_PATH = Path(__file__).resolve().parent / "data" / "common-passwords.txt"


def _load_common_passwords() -> frozenset[str]:
    with _COMMON_PASSWORDS_PATH.open("r", encoding="utf-8", errors="ignore") as f:
        return frozenset(line.strip().lower() for line in f if line.strip())


COMMON_PASSWORDS: frozenset[str] = _load_common_passwords()

RESERVED_USERNAMES: frozenset[str] = frozenset(
    {
        "admin",
        "administrator",
        "root",
        "system",
        "support",
        "help",
        "api",
        "null",
        "undefined",
        "me",
        "saigonguide",
        "saigon_guide",
        "moderator",
        "mod",
        "staff",
        "owner",
        "guest",
        "test",
        "demo",
        "official",
    }
)

_USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,30}$")


def validate_username(username: str) -> str:
    """Validate and return stripped username, preserving original casing."""
    cleaned = username.strip()
    if (
        not _USERNAME_RE.match(cleaned)
        or cleaned.startswith("_")
        or cleaned.endswith("_")
        or "__" in cleaned
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_USERNAME_INVALID",
        )

    if cleaned.lower() in RESERVED_USERNAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_USERNAME_RESERVED",
        )

    return cleaned


def validate_password(password: str, username: str) -> None:
    """Validate password strength and blocklist rules in strict priority order."""
    normalized = unicodedata.normalize("NFC", password)
    length = len(normalized)

    if length < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_PASSWORD_TOO_SHORT",
        )

    if length > 64 or len(normalized.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_PASSWORD_TOO_LONG",
        )

    if length < 15:
        has_lower = any(c.islower() for c in normalized)
        has_digit = any(c.isdigit() for c in normalized)
        if not has_lower or not has_digit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AUTH_PASSWORD_TOO_WEAK",
            )

    lowered = normalized.lower()
    if lowered in COMMON_PASSWORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_PASSWORD_COMMON",
        )

    username_lower = unicodedata.normalize("NFC", username).strip().lower()
    if username_lower and username_lower in lowered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AUTH_PASSWORD_CONTAINS_USERNAME",
        )
