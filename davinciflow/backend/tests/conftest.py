from __future__ import annotations

import asyncio
import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

TEST_DB_PATH = Path(tempfile.gettempdir()) / "davinciflow-backend-tests.db"
os.environ["DAVINCIFLOW_DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["DAVINCIFLOW_CORS_ORIGINS"] = "http://localhost:3000"
os.environ["DAVINCIFLOW_AUTH_ENABLED"] = "true"
os.environ["DAVINCIFLOW_ADMIN_USERNAME"] = "admin"
os.environ["DAVINCIFLOW_ADMIN_PASSWORD"] = "test-password"
os.environ["DAVINCIFLOW_SESSION_SECRET"] = "test-session-secret"

from app.database import AsyncSessionLocal, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.connection import Connection  # noqa: E402
from app.models.pipeline import Pipeline, PipelineRun  # noqa: E402

AUTH_PAYLOAD = {"username": "admin", "password": "test-password"}


async def _reset_database() -> None:
    await init_db()
    async with AsyncSessionLocal() as session:
        await session.execute(delete(PipelineRun))
        await session.execute(delete(Pipeline))
        await session.execute(delete(Connection))
        await session.commit()


@pytest.fixture(autouse=True)
def reset_database() -> None:
    asyncio.run(_reset_database())


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        response = test_client.post("/api/auth/login", json=AUTH_PAYLOAD)
        assert response.status_code == 200
        yield test_client


@pytest.fixture()
def unauthenticated_client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
