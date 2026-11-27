"""
security.py — Password hashing (bcrypt) & JWT token utilities.
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""

from __future__ import annotations

import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings

MAX_BCRYPT_BYTES = 72
UNUSABLE_PASSWORD_PREFIX = "!"
_BCRYPT_PREFIXES = ("$2a$", "$2b$", "$2y$")


# ---------------------------------------------------------------------------
# Password hashing — using bcrypt directly (bcrypt 5.x compatible)
# ---------------------------------------------------------------------------
def make_unusable_password(provider: str = "google") -> str:
    """Create a non-bcrypt sentinel stored for OAuth-only accounts."""
    return f"{UNUSABLE_PASSWORD_PREFIX}{provider}:{secrets.token_urlsafe(16)}"


def is_usable_password(hashed: str | None) -> bool:
    """Return True only when hashed is a usable bcrypt password hash."""
    if not hashed or hashed.startswith(UNUSABLE_PASSWORD_PREFIX):
        return False
    return hashed.startswith(_BCRYPT_PREFIXES) and len(hashed) == 60


def hash_password(plain: str) -> str:
    pwd_bytes = unicodedata.normalize("NFC", plain).encode("utf-8")
    if len(pwd_bytes) > MAX_BCRYPT_BYTES:
        raise ValueError("Password exceeds bcrypt 72-byte limit")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not is_usable_password(hashed):
        return False
    pwd_bytes = unicodedata.normalize("NFC", plain).encode("utf-8")
    if len(pwd_bytes) > MAX_BCRYPT_BYTES:
        return False
    try:
        return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))
    except ValueError:
        return False


DUMMY_HASH: str = hash_password(secrets.token_urlsafe(32))


def normalize_recovery_code(code: str) -> str:
    return re.sub(r"[-\s]", "", code).upper()


def generate_recovery_code() -> tuple[str, str]:
    alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    code = "".join(secrets.choice(alphabet) for _ in range(12))
    return f"{code[:4]}-{code[4:8]}-{code[8:]}", hash_password(code)


# ---------------------------------------------------------------------------
# JWT access tokens
# ---------------------------------------------------------------------------
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": int(now.timestamp())})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_TOKEN_EXPIRED",
            headers={"WWW-Authenticate": "Bearer"},
        )
