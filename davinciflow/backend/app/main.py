from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="DavinciFlow API",
    version="0.1.0",
    summary="Visual ELT pipeline designer backend",
)

pipelines: list[dict[str, Any]] = []
connections: list[dict[str, Any]] = []
pipeline_runs: list[dict[str, Any]] = []


class PipelineCreate(BaseModel):
    name: str
    description: str | None = None
    pipeline_json: dict[str, Any] = Field(default_factory=dict)


class ConnectionCreate(BaseModel):
    name: str
    conn_type: str
    config_json: dict[str, Any] = Field(default_factory=dict)
    secret_ref: str | None = None


class PipelineRunCreate(BaseModel):
    pipeline_id: str
    status: str = "pending"
    run_log: list[Any] = Field(default_factory=list)
    error_message: str | None = None


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "DavinciFlow API", "docs": "/docs"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/pipelines")
async def list_pipelines() -> list[dict[str, Any]]:
    return pipelines


@app.post("/api/v1/pipelines", status_code=201)
async def create_pipeline(payload: PipelineCreate) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    pipeline = {
        "id": str(uuid4()),
        "name": payload.name,
        "description": payload.description,
        "pipeline_json": payload.pipeline_json,
        "version": 1,
        "created_at": now,
        "updated_at": now,
    }
    pipelines.append(pipeline)
    return pipeline


@app.get("/api/v1/connections")
async def list_connections() -> list[dict[str, Any]]:
    return connections


@app.post("/api/v1/connections", status_code=201)
async def create_connection(payload: ConnectionCreate) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    connection = {
        "id": str(uuid4()),
        "name": payload.name,
        "conn_type": payload.conn_type,
        "config_json": payload.config_json,
        "secret_ref": payload.secret_ref,
        "created_at": now,
        "updated_at": now,
    }
    connections.append(connection)
    return connection


@app.get("/api/v1/pipeline-runs")
async def list_pipeline_runs() -> list[dict[str, Any]]:
    return pipeline_runs


@app.post("/api/v1/pipeline-runs", status_code=201)
async def create_pipeline_run(payload: PipelineRunCreate) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    run = {
        "id": str(uuid4()),
        "pipeline_id": payload.pipeline_id,
        "status": payload.status,
        "started_at": None,
        "completed_at": None,
        "run_log": payload.run_log,
        "error_message": payload.error_message,
        "created_at": now,
    }
    pipeline_runs.append(run)
    return run
