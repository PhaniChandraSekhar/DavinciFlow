from __future__ import annotations

import json
import sys
from pathlib import Path

import airbyte as ab
import pandas as pd


def build_dataframe(config: dict) -> pd.DataFrame:
    source = ab.get_source(
        config["source_name"],
        config=config.get("config_dict") or {},
        streams=config.get("streams") or [],
        install_if_missing=True,
    )
    source.check()

    if config.get("destination", "duckdb") == "duckdb":
        cache = ab.DuckDBCache(db_path=config.get("duckdb_path", "/tmp/davinciflow_cache.duckdb"))
    else:
        cache = ab.PostgresCache(
            host=config.get("postgres_host", "localhost"),
            port=config.get("postgres_port", 5432),
            database=config.get("postgres_database", "davinciflow"),
            username=config.get("postgres_username", "postgres"),
            password=config.get("postgres_password", ""),
            schema_name=config.get("postgres_schema", "airbyte_raw"),
        )

    result = source.read(cache=cache)

    frames: list[pd.DataFrame] = []
    for stream_name in config.get("streams") or []:
        try:
            stream_df = result.cache.streams[stream_name].to_pandas()
            stream_df["_stream"] = stream_name
            frames.append(stream_df)
        except Exception:
            continue

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    airbyte_cols = [column for column in combined.columns if column.startswith("_airbyte_")]
    return combined.drop(columns=airbyte_cols, errors="ignore")


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: runner.py <config-path> <output-path>", file=sys.stderr)
        return 2

    config_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    config = json.loads(config_path.read_text(encoding="utf-8"))
    dataframe = build_dataframe(config)
    dataframe.to_parquet(output_path, index=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
