from __future__ import annotations

from functools import lru_cache
from secrets import token_urlsafe

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.services.passwords import is_password_hash


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
    auth_enabled: bool | None = Field(
        default=None,
        validation_alias=AliasChoices("DAVINCIFLOW_AUTH_ENABLED", "AUTH_ENABLED"),
    )
    admin_username: str = Field(
        default="admin",
        validation_alias=AliasChoices("DAVINCIFLOW_ADMIN_USERNAME", "ADMIN_USERNAME"),
    )
    admin_password: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DAVINCIFLOW_ADMIN_PASSWORD", "ADMIN_PASSWORD"),
    )
    session_secret: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DAVINCIFLOW_SESSION_SECRET", "SESSION_SECRET", "SECRET_KEY"),
    )
    session_cookie_name: str = Field(
        default="davinciflow_session",
        validation_alias=AliasChoices("DAVINCIFLOW_SESSION_COOKIE_NAME", "SESSION_COOKIE_NAME"),
    )
    encryption_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DAVINCIFLOW_ENCRYPTION_KEY", "ENCRYPTION_KEY"),
    )
    session_max_age_seconds: int = Field(
        default=60 * 60 * 12,
        validation_alias=AliasChoices("DAVINCIFLOW_SESSION_MAX_AGE_SECONDS", "SESSION_MAX_AGE_SECONDS"),
    )
    secure_cookies: bool | None = Field(
        default=None,
        validation_alias=AliasChoices("DAVINCIFLOW_SECURE_COOKIES", "SECURE_COOKIES"),
    )
    runtime_session_secret: str = Field(default_factory=lambda: token_urlsafe(32))

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        enable_decoding=False,
        extra="ignore",
        populate_by_name=True,
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def validate_runtime_settings(self) -> "Settings":
        environment = self.environment.strip().lower()

        if self.auth_enabled is None:
            self.auth_enabled = environment != "development"

        if self.secure_cookies is None:
            self.secure_cookies = environment != "development"

        if self.auth_enabled:
            if not self.admin_password:
                raise ValueError("DAVINCIFLOW_ADMIN_PASSWORD must be configured when auth is enabled")
            if not self.session_secret:
                raise ValueError("DAVINCIFLOW_SESSION_SECRET must be configured when auth is enabled")
            if "*" in self.cors_origins:
                raise ValueError("CORS_ORIGINS cannot contain '*' when cookie auth is enabled")
            if environment != "development" and not is_password_hash(self.admin_password):
                raise ValueError("DAVINCIFLOW_ADMIN_PASSWORD must be a password hash outside development")

        if not self.encryption_key:
            if environment != "development":
                raise ValueError("DAVINCIFLOW_ENCRYPTION_KEY must be configured outside development")
            self.encryption_key = self.session_secret or self.runtime_session_secret

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
