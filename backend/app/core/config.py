from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_ENV_FILE, ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_ENV: str = "development"
    APP_NAME: str = "SolarScope API"
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "solarscope"

    # Security
    JWT_SECRET: str = "CHANGE_ME_in_production_min_64_chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # File uploads
    UPLOAD_MAX_MB: int = 50
    UPLOAD_DIR: str = "/tmp/solarscope_uploads"

    # Storage
    STORAGE_BUCKET: str = ""

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def mongodb_database(self) -> str:
        return self.MONGODB_DATABASE


@lru_cache
def get_settings() -> Settings:
    return Settings()
