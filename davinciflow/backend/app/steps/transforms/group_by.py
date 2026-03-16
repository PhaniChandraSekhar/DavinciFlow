from __future__ import annotations

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class AggregationRule(BaseModel):
    column: str
    function: str


class GroupByConfig(BaseModel):
    group_columns: list[str] = Field(default_factory=list)
    aggregations: list[AggregationRule] = Field(default_factory=list)


class GroupByStep(BaseStep):
    display_name = "Group By"
    type = "transform.group_by"
    description = "Group rows and apply aggregations."
    icon = "group"
    category = "transforms"
    ConfigModel = GroupByConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if frame.empty:
            return frame
        aggregation_map = {item.column: item.function for item in self.config.aggregations}
        grouped = frame.groupby(self.config.group_columns, dropna=False).agg(aggregation_map)
        return grouped.reset_index()
