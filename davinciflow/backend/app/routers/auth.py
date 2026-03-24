from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.config import get_settings
from app.schemas.auth import AuthSessionRead, LoginRequest
from app.services.auth import (
    authenticate_admin,
    end_authenticated_session,
    get_authenticated_username,
    start_authenticated_session,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/session", response_model=AuthSessionRead)
async def get_session(request: Request) -> AuthSessionRead:
    settings = get_settings()
    username = get_authenticated_username(request)
    return AuthSessionRead(
        auth_enabled=settings.auth_enabled,
        authenticated=bool(username) if settings.auth_enabled else True,
        username=username if settings.auth_enabled else None,
    )


@router.post("/login", response_model=AuthSessionRead)
async def login(payload: LoginRequest, request: Request) -> AuthSessionRead:
    settings = get_settings()
    if not settings.auth_enabled:
        return AuthSessionRead(auth_enabled=False, authenticated=True, username=None)

    if not authenticate_admin(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    start_authenticated_session(request, settings.admin_username)
    return AuthSessionRead(
        auth_enabled=True,
        authenticated=True,
        username=settings.admin_username,
    )


@router.delete("/session", response_model=AuthSessionRead)
async def logout(request: Request) -> AuthSessionRead:
    settings = get_settings()
    end_authenticated_session(request)
    return AuthSessionRead(
        auth_enabled=settings.auth_enabled,
        authenticated=not settings.auth_enabled,
        username=None,
    )
