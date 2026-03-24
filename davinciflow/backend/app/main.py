from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
settings = get_settings()
from app.routers import pipelines, connections, execution, steps

app = FastAPI(
    title="DavinciFlow API",
    version="0.1.0",
    summary="Visual ELT pipeline designer backend",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if isinstance(settings.cors_origins, list) else [o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(pipelines.router)
app.include_router(connections.router)
app.include_router(execution.router)
app.include_router(steps.router)


@app.on_event("startup")
async def startup() -> None:
    await init_db()


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "DavinciFlow API", "version": "0.1.0", "docs": "/docs"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
