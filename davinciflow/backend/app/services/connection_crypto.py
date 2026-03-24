from __future__ import annotations

import base64
import hashlib
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings
from app.schemas.connection import is_sensitive_config_key

ENCRYPTED_PREFIX = "enc::"


def _get_fernet() -> Fernet:
    secret = get_settings().encryption_key.encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)


def encrypt_secret_value(value: str) -> str:
    if not value or value.startswith(ENCRYPTED_PREFIX):
        return value
    token = _get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")
    return f"{ENCRYPTED_PREFIX}{token}"


def decrypt_secret_value(value: str) -> str:
    if not value.startswith(ENCRYPTED_PREFIX):
        return value

    token = value[len(ENCRYPTED_PREFIX) :].encode("utf-8")
    try:
        return _get_fernet().decrypt(token).decode("utf-8")
    except InvalidToken:
        return value


def encrypt_connection_config(config: dict[str, Any]) -> dict[str, Any]:
    encrypted: dict[str, Any] = {}

    for key, value in config.items():
        if isinstance(value, dict):
            encrypted[key] = encrypt_connection_config(value)
            continue

        if isinstance(value, list):
            encrypted[key] = [
                encrypt_connection_config(item) if isinstance(item, dict) else item for item in value
            ]
            continue

        if is_sensitive_config_key(key) and isinstance(value, str) and value:
            encrypted[key] = encrypt_secret_value(value)
            continue

        encrypted[key] = value

    return encrypted


def decrypt_connection_config(config: dict[str, Any]) -> dict[str, Any]:
    decrypted: dict[str, Any] = {}

    for key, value in config.items():
        if isinstance(value, dict):
            decrypted[key] = decrypt_connection_config(value)
            continue

        if isinstance(value, list):
            decrypted[key] = [
                decrypt_connection_config(item) if isinstance(item, dict) else item for item in value
            ]
            continue

        if is_sensitive_config_key(key) and isinstance(value, str) and value:
            decrypted[key] = decrypt_secret_value(value)
            continue

        decrypted[key] = value

    return decrypted
