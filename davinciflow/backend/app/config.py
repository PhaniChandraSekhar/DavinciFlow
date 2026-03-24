from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(
        default="DavinciFlow Backend",
        validation_alias=AliasChoices("DAVINCIFLOW_APP_NAME", "APP_NAME"),
    )
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("DAVINCIFLOW_ENVIRONMENT", "ENVIRONMENT"),
    )
    api_prefix: str = Field(
        default="/api",
        validation_alias=AliasChoices("DAVINCIFLOW_API_PREFIX", "API_PREFIX"),
    )
    database_url: str = Field(
        default="sqlite+aiosqlite:///./davinciflow.db",
        validation_alias=AliasChoices("DAVINCIFLOW_DATABASE_URL", "DATABASE_URL"),
    )
    cors_origins: list[str] = Field(
        default_factory=lambda: ["*"],
        validation_alias=AliasChoices("DAVINCIFLOW_CORS_ORIGINS", "CORS_ORIGINS"),
    )
    log_level: str = Field(
        default="INFO",
        validation_alias=AliasChoices("DAVINCIFLOW_LOG_LEVEL", "LOG_LEVEL"),
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        enable_decoding=False,
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
