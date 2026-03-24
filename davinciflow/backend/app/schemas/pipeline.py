from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PipelineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    pipeline_json: dict[str, Any]


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
