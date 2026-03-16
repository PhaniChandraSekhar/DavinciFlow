from __future__ import annotations

from typing import Literal

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class DeduplicatorConfig(BaseModel):
    key_columns: list[str] = Field(default_factory=list)
    keep: Literal["first", "last"] = "first"


class DeduplicatorStep(BaseStep):
    display_name = "Deduplicator"
    type = "transform.deduplicator"
    description = "Drop duplicate rows using selected key columns."
    icon = "copy-x"
    category = "transforms"
    ConfigModel = DeduplicatorConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        subset = self.config.key_columns or None
        return frame.drop_duplicates(subset=subset, keep=self.config.keep)

