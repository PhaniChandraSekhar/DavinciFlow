from __future__ import annotations

from hmac import compare_digest

from fastapi import HTTPException, Request, WebSocket, status

from app.config import get_settings

SESSION_USER_KEY = "authenticated_user"


def authenticate_admin(username: str, password: str) -> bool:
    settings = get_settings()
    expected_password = settings.admin_password or ""
    return compare_digest(username, settings.admin_username) and compare_digest(
        password, expected_password
    )


def get_authenticated_username(connection: Request | WebSocket) -> str | None:
    settings = get_settings()
    if not settings.auth_enabled:
        return settings.admin_username

    session = connection.scope.get("session") or {}
    username = session.get(SESSION_USER_KEY)
    if username == settings.admin_username:
        return username
    return None


def start_authenticated_session(request: Request, username: str) -> None:
    request.session.clear()
    request.session[SESSION_USER_KEY] = username


def end_authenticated_session(request: Request) -> None:
    request.session.clear()


async def require_session_auth(request: Request) -> None:
    settings = get_settings()
    if not settings.auth_enabled:
        return

    if get_authenticated_username(request) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )


async def ensure_websocket_auth(websocket: WebSocket) -> bool:
    settings = get_settings()
    if not settings.auth_enabled:
        return True

    if get_authenticated_username(websocket) is not None:
        return True

    await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
    return False
