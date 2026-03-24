from __future__ import annotations

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class AuthSessionRead(BaseModel):
    auth_enabled: bool
    authenticated: bool
    username: str | None = None
