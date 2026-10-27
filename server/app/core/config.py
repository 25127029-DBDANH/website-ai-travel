import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    CLIENT_ORIGIN: str = "http://localhost:5173"
    
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/hcmc_travel_db"
    
    JWT_SECRET: str = "default_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    GEMINI_API_KEY: str = ""
    GOOGLE_PLACES_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/calendar/callback"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
