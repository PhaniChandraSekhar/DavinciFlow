from __future__ import annotations

import asyncio

import pandas as pd
from pydantic import BaseModel

from app.services.security import resolve_safe_path
from app.steps.base import BaseStep


class CSVOutputConfig(BaseModel):
    file_path: str


class CSVOutputStep(BaseStep):
    display_name = "CSV Output"
    type = "sink.csv_output"
    description = "Write the incoming DataFrame to a CSV file."
    icon = "file-up"
    category = "sinks"
    ConfigModel = CSVOutputConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        file_path = resolve_safe_path(self.config.file_path, purpose="write")
        await asyncio.to_thread(frame.to_csv, str(file_path), index=False)
        return frame
