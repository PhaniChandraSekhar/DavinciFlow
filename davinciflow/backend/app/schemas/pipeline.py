from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PipelineCanvasPosition(BaseModel):
    x: float
    y: float


class PipelineNodePayload(BaseModel):
    id: str = Field(min_length=1, max_length=255)
    type: str | None = Field(default=None, max_length=128)
    position: PipelineCanvasPosition
    data: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="allow")


class PipelineEdgePayload(BaseModel):
    id: str = Field(min_length=1, max_length=255)
    source: str = Field(min_length=1, max_length=255)
    target: str = Field(min_length=1, max_length=255)
    animated: bool | None = None
    label: str | None = Field(default=None, max_length=255)

    model_config = ConfigDict(extra="allow")


class PipelineDocument(BaseModel):
    nodes: list[PipelineNodePayload] = Field(default_factory=list)
    edges: list[PipelineEdgePayload] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")


class PipelineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    pipeline_json: PipelineDocument


class PipelineRead(PipelineCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    latest_run_status: str | None = None
    latest_run_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PipelineList(BaseModel):
    items: list[PipelineRead]
    total: int
