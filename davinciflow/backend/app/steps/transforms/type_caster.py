from __future__ import annotations

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class ColumnCast(BaseModel):
    column: str
    target_type: str


class TypeCasterConfig(BaseModel):
    casts: list[ColumnCast] = Field(default_factory=list)


class TypeCasterStep(BaseStep):
    display_name = "Type Caster"
    type = "transform.type_caster"
    description = "Cast DataFrame columns to target types."
    icon = "type"
    category = "transforms"
    ConfigModel = TypeCasterConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        for cast in self.config.casts:
            if cast.column not in frame.columns:
                continue
            target = cast.target_type.lower()
            if target in {"int", "integer"}:
                frame[cast.column] = pd.to_numeric(frame[cast.column], errors="coerce").astype("Int64")
            elif target in {"float", "double"}:
                frame[cast.column] = pd.to_numeric(frame[cast.column], errors="coerce")
            elif target in {"str", "string"}:
                frame[cast.column] = frame[cast.column].astype("string")
            elif target in {"bool", "boolean"}:
                frame[cast.column] = frame[cast.column].astype("boolean")
            elif target in {"datetime", "timestamp"}:
                frame[cast.column] = pd.to_datetime(frame[cast.column], errors="coerce", utc=True)
            else:
                frame[cast.column] = frame[cast.column].astype(target)
        return frame

