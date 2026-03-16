from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DavinciFlow Backend"
    environment: str = "development"
    api_prefix: str = "/api"
    database_url: str = "sqlite+aiosqlite:///./davinciflow.db"
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_prefix="DAVINCIFLOW_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

