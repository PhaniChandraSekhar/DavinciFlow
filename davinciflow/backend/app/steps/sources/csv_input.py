from __future__ import annotations

import asyncio

import pandas as pd
from pydantic import BaseModel

from app.services.security import resolve_safe_path
from app.steps.base import BaseStep


class CSVInputConfig(BaseModel):
    file_path: str
    delimiter: str = ","
    encoding: str = "utf-8"


class CSVInputStep(BaseStep):
    display_name = "CSV Input"
    type = "source.csv_input"
    description = "Read records from a CSV file on disk."
    icon = "file"
    category = "sources"
    ConfigModel = CSVInputConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        file_path = resolve_safe_path(self.config.file_path, purpose="read")
        return await asyncio.to_thread(
            pd.read_csv,
            str(file_path),
            sep=self.config.delimiter,
            encoding=self.config.encoding,
        )
