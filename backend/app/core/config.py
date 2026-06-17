from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"
    MAX_UPLOAD_MB: int = 500

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/geospatial_db"
    SYNC_DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/geospatial_db"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Auth
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Gemini
    GEMINI_API_KEY: str = ""

    # Storage
    STORAGE_BUCKET: str = "geospatial-imagery"
    STORAGE_ENDPOINT_URL: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    STORAGE_REGION: str = "auto"

    # Workers — set INLINE_PROCESSING=true on free hosts (no Redis/Celery needed)
    INLINE_PROCESSING: bool = False
    WORKER_CONCURRENCY: int = 4

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
