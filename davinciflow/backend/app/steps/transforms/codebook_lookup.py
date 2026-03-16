from __future__ import annotations

from typing import Any

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class CodebookLookupConfig(BaseModel):
    column: str
    mappings: dict[str, Any] = Field(default_factory=dict)


class CodebookLookupStep(BaseStep):
    display_name = "Codebook Lookup"
    type = "transform.codebook_lookup"
    description = "Replace source values using a codebook mapping."
    icon = "book-marked"
    category = "transforms"
    ConfigModel = CodebookLookupConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if self.config.column in frame.columns:
            frame[self.config.column] = frame[self.config.column].replace(self.config.mappings)
        return frame

