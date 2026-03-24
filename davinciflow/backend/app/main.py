from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.database import check_database, init_db
from app.services.auth import require_session_auth
from app.routers import auth, pipelines, connections, execution, steps

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="DavinciFlow API",
    version="0.1.0",
    summary="Visual ELT pipeline designer backend",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret or settings.runtime_session_secret,
    same_site="lax",
    https_only=bool(settings.secure_cookies),
    max_age=settings.session_max_age_seconds,
    session_cookie=settings.session_cookie_name,
)

# Routers
protected = [Depends(require_session_auth)]
app.include_router(auth.router)
app.include_router(pipelines.router, dependencies=protected)
app.include_router(connections.router, dependencies=protected)
app.include_router(execution.router)
app.include_router(steps.router, dependencies=protected)

@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "DavinciFlow API", "version": "0.1.0", "docs": "/docs"}


@app.get("/health")
async def health() -> dict[str, object]:
    database_ok = await check_database()
    return {
        "status": "ok" if database_ok else "degraded",
        "service": settings.app_name,
        "environment": settings.environment,
        "checks": {
            "database": "ok" if database_ok else "error",
        },
    }


@app.get("/health/live")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready", response_model=None)
async def readiness():
    if await check_database():
        return {"status": "ok"}
    return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content={"status": "error"})
