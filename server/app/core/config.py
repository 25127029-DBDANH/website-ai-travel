"""
config.py — Application settings loaded from .env
Author  : Đỗ Nguyễn An Khang (Backend Lead & Auth Service)
"""

from __future__ import annotations

import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

DEFAULT_JWT_SECRET = "change-me-to-a-random-string"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./travel.db"
    JWT_SECRET: str = DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:3000,"
        "http://127.0.0.1:5173,http://127.0.0.1:3000"
    )

    GEMINI_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> Settings:
        if self.APP_ENV.strip().lower() == "production":
            if not self.JWT_SECRET.strip() or self.JWT_SECRET == DEFAULT_JWT_SECRET:
                raise ValueError(
                    "JWT_SECRET must be set to a strong, non-default secret when "
                    "APP_ENV=production."
                )
        return self

    def validate_runtime_config(self) -> None:
        """Validate critical production settings and warn about non-persistent DBs."""
        if self.APP_ENV.strip().lower() != "production":
            return
        if not self.JWT_SECRET.strip() or self.JWT_SECRET == DEFAULT_JWT_SECRET:
            raise ValueError(
                "JWT_SECRET must be set to a strong, non-default secret when APP_ENV=production."
            )
        if self.DATABASE_URL.strip().lower().startswith("sqlite"):
            logger.warning(
                "APP_ENV=production is configured with a SQLite DATABASE_URL; "
                "use PostgreSQL (e.g. Neon) for persistent production storage."
            )


settings = Settings()
