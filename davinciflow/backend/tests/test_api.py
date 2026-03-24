from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from app.database import AsyncSessionLocal
from app.models.pipeline import PipelineRun
from app.routers import execution as execution_router


def test_health_endpoint(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


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
