from __future__ import annotations

import json

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class FlattenJSONConfig(BaseModel):
    column: str
    max_level: int | None = Field(default=None, ge=0)


class FlattenJSONStep(BaseStep):
    display_name = "Flatten JSON"
    type = "transform.flatten_json"
    description = "Flatten a JSON object column into top-level columns."
    icon = "unfold-vertical"
    category = "transforms"
    ConfigModel = FlattenJSONConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if self.config.column not in frame.columns or frame.empty:
            return frame

        normalized_rows = []
        for value in frame[self.config.column]:
            parsed = value
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                except json.JSONDecodeError:
                    parsed = {}
            if not isinstance(parsed, dict):
                parsed = {}
            normalized_rows.append(parsed)

        normalized = pd.json_normalize(normalized_rows, max_level=self.config.max_level)
        normalized.columns = [f"{self.config.column}.{column}" for column in normalized.columns]
        remaining = frame.drop(columns=[self.config.column]).reset_index(drop=True)
        return pd.concat([remaining, normalized], axis=1)

