from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import app.main as main_module
from app.database import AsyncSessionLocal
from app.models.connection import Connection
from app.models.pipeline import PipelineRun
from app.routers import execution as execution_router
from app.schemas.connection import REDACTED_SECRET


def test_health_endpoint(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["checks"]["database"] == "ok"


def test_readiness_endpoint(client) -> None:
    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_liveness_endpoint(client) -> None:
    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_endpoint_returns_503_when_database_unavailable(monkeypatch, client) -> None:
    async def fake_check_database() -> bool:
        return False

    monkeypatch.setattr(main_module, "check_database", fake_check_database)

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {"status": "error"}


def test_steps_endpoint_includes_airbyte_and_dbt(client) -> None:
    response = client.get("/api/steps")

    assert response.status_code == 200
    payload = response.json()
    step_types = {item["type"] for group in payload.values() for item in group}

    assert "source.airbyte" in step_types
    assert "transform.dbt" in step_types


def test_pipeline_list_includes_latest_run_status(client) -> None:
    create_response = client.post(
        "/api/pipelines",
        json={"name": "Status Test", "description": None, "pipeline_json": {"nodes": [], "edges": []}},
    )
    pipeline_id = create_response.json()["id"]

    async def insert_run() -> None:
        async with AsyncSessionLocal() as session:
            session.add(
                PipelineRun(
                    pipeline_id=pipeline_id,
                    status="completed",
                    parameters={},
                    logs=[],
                    started_at=datetime.now(UTC),
                    completed_at=datetime.now(UTC),
                )
            )
            await session.commit()

    asyncio.run(insert_run())

    response = client.get("/api/pipelines")

    assert response.status_code == 200
    item = next(p for p in response.json()["items"] if p["id"] == pipeline_id)
    assert item["latest_run_status"] == "completed"
    assert item["latest_run_at"] is not None


def test_run_pipeline_returns_queued_run(monkeypatch, client) -> None:
    create_response = client.post(
        "/api/pipelines",
        json={"name": "Run Test", "description": None, "pipeline_json": {"nodes": [], "edges": []}},
    )
    pipeline_id = create_response.json()["id"]

    async def fake_start_run(*, pipeline_id: int, pipeline_json: dict, parameters: dict):
        return PipelineRun(
            id=999,
            pipeline_id=pipeline_id,
            status="queued",
            parameters=parameters,
            logs=[],
            started_at=datetime.now(UTC),
        )

    monkeypatch.setattr(execution_router.execution_engine, "start_run", fake_start_run)

    response = client.post(f"/api/pipelines/{pipeline_id}/run", json={})

    assert response.status_code == 202
    payload = response.json()
    assert payload["id"] == 999
    assert payload["pipeline_id"] == pipeline_id
    assert payload["status"] == "queued"


def test_runs_endpoint_lists_runs_for_pipeline(client) -> None:
    create_response = client.post(
        "/api/pipelines",
        json={"name": "Run List Test", "description": None, "pipeline_json": {"nodes": [], "edges": []}},
    )
    pipeline_id = create_response.json()["id"]

    async def insert_run() -> None:
        async with AsyncSessionLocal() as session:
            session.add(
                PipelineRun(
                    pipeline_id=pipeline_id,
                    status="failed",
                    parameters={},
                    logs=[],
                    started_at=datetime.now(UTC),
                    completed_at=datetime.now(UTC),
                )
            )
            await session.commit()

    asyncio.run(insert_run())

    response = client.get(f"/api/runs?pipeline_id={pipeline_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["pipeline_id"] == pipeline_id
    assert payload["items"][0]["status"] == "failed"


def test_connection_responses_redact_secrets(client) -> None:
    response = client.post(
        "/api/connections",
        json={
            "name": "Warehouse",
            "type": "postgres",
            "description": "Primary warehouse",
            "config": {
                "host": "db.internal",
                "port": 5432,
                "username": "analytics",
                "password": "super-secret",
                "api_key": "key-123",
            },
        },
    )

    assert response.status_code == 201
    payload = response.json()
    connection_id = payload["id"]
    assert payload["config"]["password"] == REDACTED_SECRET
    assert payload["config"]["api_key"] == REDACTED_SECRET
    assert payload["config"]["host"] == "db.internal"

    list_response = client.get("/api/connections")
    assert list_response.status_code == 200
    assert list_response.json()[0]["config"]["password"] == REDACTED_SECRET

    get_response = client.get(f"/api/connections/{connection_id}")
    assert get_response.status_code == 200
    assert get_response.json()["config"]["api_key"] == REDACTED_SECRET

    async def fetch_connection() -> Connection | None:
        async with AsyncSessionLocal() as session:
            return await session.get(Connection, connection_id)

    stored = asyncio.run(fetch_connection())
    assert stored is not None
    assert stored.config["password"] == "super-secret"
    assert stored.config["api_key"] == "key-123"


def test_connection_update_preserves_redacted_secret(client) -> None:
    create_response = client.post(
        "/api/connections",
        json={
            "name": "CRM API",
            "type": "api",
            "description": None,
            "config": {
                "host": "api.example.com",
                "token": "token-123",
            },
        },
    )
    connection_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/connections/{connection_id}",
        json={
            "name": "CRM API",
            "type": "api",
            "description": None,
            "config": {
                "host": "api.internal.example.com",
                "token": REDACTED_SECRET,
            },
        },
    )

    assert update_response.status_code == 200
    payload = update_response.json()
    assert payload["config"]["host"] == "api.internal.example.com"
    assert payload["config"]["token"] == REDACTED_SECRET

    async def fetch_connection() -> Connection | None:
        async with AsyncSessionLocal() as session:
            return await session.get(Connection, connection_id)

    stored = asyncio.run(fetch_connection())
    assert stored is not None
    assert stored.config["host"] == "api.internal.example.com"
    assert stored.config["token"] == "token-123"
