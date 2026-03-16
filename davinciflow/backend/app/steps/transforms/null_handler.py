from __future__ import annotations

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class NullHandlerConfig(BaseModel):
    null_values: list[str] = Field(default_factory=list)


class NullHandlerStep(BaseStep):
    display_name = "Null Handler"
    type = "transform.null_handler"
    description = "Replace configured placeholder values with nulls."
    icon = "circle-off"
    category = "transforms"
    ConfigModel = NullHandlerConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if not self.config.null_values:
            return frame
        return frame.replace(self.config.null_values, pd.NA)

