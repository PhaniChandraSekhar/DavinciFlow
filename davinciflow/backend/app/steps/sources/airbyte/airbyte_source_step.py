from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from typing import Any, Literal

import pandas as pd
from pydantic import BaseModel, Field

from app.services.security import resolve_safe_path
from app.steps.base import BaseStep

AIRBYTE_TIMEOUT_SECONDS = 300
AIRBYTE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")


class AirbyteSourceConfig(BaseModel):
    source_name: str = Field(
        description="PyAirbyte connector name, e.g. source-faker, source-postgres, source-shopify"
    )
    streams: list[str] = Field(
        description="List of stream names to extract, e.g. ['orders', 'customers']"
    )
    config_dict: dict[str, Any] = Field(
        default_factory=dict,
        description="Connector config dict (credentials, host, etc). For source-faker: {'count': 500, 'seed': 42}"
    )
    destination: Literal["duckdb", "postgres"] = Field(
        default="duckdb",
        description="Where to load raw data before returning as DataFrame"
    )
    # DuckDB destination options
    duckdb_path: str = Field(
        default="/tmp/davinciflow_cache.duckdb",
        description="Path to DuckDB file (used when destination=duckdb)"
    )
    # Postgres destination options (used when destination=postgres)
    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)
    postgres_database: str = Field(default="davinciflow")
    postgres_username: str = Field(default="postgres")
    postgres_password: str = Field(default="")
    postgres_schema: str = Field(default="airbyte_raw")


class AirbyteSourceStep(BaseStep):
    display_name = "Airbyte Source"
    type = "source.airbyte"
    description = "Extract data from 600+ sources via PyAirbyte (APIs, databases, SaaS tools)."
    icon = "database"
    category = "sources"
    ConfigModel = AirbyteSourceConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        """Run PyAirbyte extract+load in a thread (it's sync), return combined DataFrame."""
        return await asyncio.to_thread(self._sync_extract)

    def _sync_extract(self) -> pd.DataFrame:
        runner = Path(__file__).with_name("runner.py")
        elt_python = self.get_elt_python()
        if not AIRBYTE_NAME_PATTERN.fullmatch(self.config.source_name):
            raise ValueError("Invalid Airbyte source name")
        for stream in self.config.streams:
            if not AIRBYTE_NAME_PATTERN.fullmatch(stream):
                raise ValueError(f"Invalid Airbyte stream name '{stream}'")

        config_payload = self.config.model_dump()
        if self.config.destination == "duckdb":
            config_payload["duckdb_path"] = str(resolve_safe_path(self.config.duckdb_path, purpose="write"))

        with tempfile.TemporaryDirectory(prefix="davinciflow-airbyte-") as tmpdir:
            tmp_path = Path(tmpdir)
            config_path = tmp_path / "config.json"
            output_path = tmp_path / "output.parquet"
            config_path.write_text(json.dumps(config_payload), encoding="utf-8")

            try:
                result = subprocess.run(
                    [elt_python, str(runner), str(config_path), str(output_path)],
                    capture_output=True,
                    text=True,
                    cwd=str(tmp_path),
                    env={**os.environ, "PYTHONUTF8": "1"},
                    timeout=AIRBYTE_TIMEOUT_SECONDS,
                )
            except subprocess.TimeoutExpired as exc:
                raise RuntimeError(
                    f"PyAirbyte extract timed out after {AIRBYTE_TIMEOUT_SECONDS} seconds"
                ) from exc

            if result.returncode != 0:
                raise RuntimeError(
                    "PyAirbyte extract failed:\n"
                    f"{result.stdout}\n{result.stderr}".strip()
                )

            if not output_path.exists():
                return pd.DataFrame()

            return pd.read_parquet(output_path)
