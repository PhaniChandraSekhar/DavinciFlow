from __future__ import annotations

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class FieldMapping(BaseModel):
    source: str
    target: str


class FieldMapperConfig(BaseModel):
    mappings: list[FieldMapping] = Field(default_factory=list)


class FieldMapperStep(BaseStep):
    display_name = "Field Mapper"
    type = "transform.field_mapper"
    description = "Rename columns based on source-target mappings."
    icon = "shuffle"
    category = "transforms"
    ConfigModel = FieldMapperConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        return frame.rename(columns={item.source: item.target for item in self.config.mappings})

