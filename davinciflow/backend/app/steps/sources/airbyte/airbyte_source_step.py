from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path
from typing import Any, Literal

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


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
        try:
            import airbyte as ab
        except ImportError as e:
            raise RuntimeError(
                "PyAirbyte not installed. Add 'airbyte>=0.20.0' to requirements.txt"
            ) from e

        source = ab.get_source(
            self.config.source_name,
            config=self.config.config_dict,
            streams=self.config.streams,
            install_if_missing=True,
        )
        source.check()

        if self.config.destination == "duckdb":
            cache = ab.DuckDBCache(db_path=self.config.duckdb_path)
        else:
            cache = ab.PostgresCache(
                host=self.config.postgres_host,
                port=self.config.postgres_port,
                database=self.config.postgres_database,
                username=self.config.postgres_username,
                password=self.config.postgres_password,
                schema_name=self.config.postgres_schema,
            )

        result = source.read(cache=cache)

        # Combine all requested streams into one DataFrame with a '_stream' column
        frames = []
        for stream_name in self.config.streams:
            try:
                stream_df = result.cache.streams[stream_name].to_pandas()
                stream_df["_stream"] = stream_name
                frames.append(stream_df)
            except Exception:
                pass

        if not frames:
            return pd.DataFrame()

        combined = pd.concat(frames, ignore_index=True)
        # Drop internal airbyte columns from the output DataFrame
        airbyte_cols = [c for c in combined.columns if c.startswith("_airbyte_")]
        return combined.drop(columns=airbyte_cols, errors="ignore")
