from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PipelineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    pipeline_json: dict[str, Any]


class PipelineRead(PipelineCreate):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PipelineList(BaseModel):
    items: list[PipelineRead]
    total: int
