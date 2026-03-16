from __future__ import annotations

import pandas as pd
from pydantic import BaseModel

from app.steps.base import BaseStep


class UnitConverterConfig(BaseModel):
    column: str
    factor: float
    new_column_name: str | None = None


class UnitConverterStep(BaseStep):
    display_name = "Unit Converter"
    type = "transform.unit_converter"
    description = "Multiply a numeric column by a conversion factor."
    icon = "ruler"
    category = "transforms"
    ConfigModel = UnitConverterConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if self.config.column not in frame.columns:
            return frame
        target_column = self.config.new_column_name or self.config.column
        frame[target_column] = pd.to_numeric(frame[self.config.column], errors="coerce") * self.config.factor
        return frame

