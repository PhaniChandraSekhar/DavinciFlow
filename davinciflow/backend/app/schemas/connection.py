from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

REDACTED_SECRET = "********"
SENSITIVE_CONFIG_TOKENS = (
    "password",
    "secret",
    "token",
    "api_key",
    "access_key",
    "secret_key",
    "private_key",
    "client_secret",
    "refresh_key",
    "refresh_token",
    "account_key",
    "sasl_password",
)


def is_sensitive_config_key(key: str) -> bool:
    normalized = key.strip().lower().replace("-", "_")
    return any(token in normalized for token in SENSITIVE_CONFIG_TOKENS)


def redact_connection_config(config: dict[str, Any]) -> dict[str, Any]:
    redacted: dict[str, Any] = {}

    for key, value in config.items():
        if isinstance(value, dict):
            redacted[key] = redact_connection_config(value)
            continue

        if isinstance(value, list):
            redacted[key] = [
                redact_connection_config(item) if isinstance(item, dict) else item for item in value
            ]
            continue

        if is_sensitive_config_key(key) and value not in (None, ""):
            redacted[key] = REDACTED_SECRET
            continue

        redacted[key] = value

    return redacted


def merge_connection_config(
    existing_config: dict[str, Any], incoming_config: dict[str, Any]
) -> dict[str, Any]:
    merged = dict(existing_config)

    for key, value in incoming_config.items():
        existing_value = merged.get(key)

        if isinstance(value, dict) and isinstance(existing_value, dict):
            merged[key] = merge_connection_config(existing_value, value)
            continue

        if is_sensitive_config_key(key) and value == REDACTED_SECRET and existing_value not in (None, ""):
            continue

        merged[key] = value

    return merged


class ConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=100)
    description: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)


class ConnectionRead(ConnectionCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
