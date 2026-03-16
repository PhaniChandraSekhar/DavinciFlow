from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RunCreate(BaseModel):
    parameters: dict[str, Any] = Field(default_factory=dict)


class RunLog(BaseModel):
    step_id: str
    step_name: str
    node_type: str
    status: str
    records_in: int
    records_out: int
    duration_ms: int
    error: str | None = None
    started_at: datetime
    finished_at: datetime | None = None


class RunRead(BaseModel):
    id: int
    pipeline_id: int
    status: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    logs: list[RunLog] = Field(default_factory=list)
    error: str | None = None
    started_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("logs", mode="before")
    @classmethod
    def parse_logs(cls, value: Any) -> list[dict[str, Any]]:
        return value or []

