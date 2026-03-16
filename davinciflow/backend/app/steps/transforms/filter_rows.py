from __future__ import annotations

import pandas as pd
from pydantic import BaseModel

from app.steps.base import BaseStep


class FilterRowsConfig(BaseModel):
    expression: str


class FilterRowsStep(BaseStep):
    display_name = "Filter Rows"
    type = "transform.filter_rows"
    description = "Filter rows using a pandas query expression."
    icon = "filter"
    category = "transforms"
    ConfigModel = FilterRowsConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if frame.empty:
            return frame
        return frame.query(self.config.expression)

