from __future__ import annotations

import asyncio
import os
import subprocess
from pathlib import Path

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class DbtTransformConfig(BaseModel):
    dbt_project_dir: str = Field(
        description="Absolute path to the dbt project directory (contains dbt_project.yml)"
    )
    profiles_dir: str | None = Field(
        default=None,
        description="Path to profiles.yml directory. Defaults to dbt_project_dir."
    )
    select: str = Field(
        default="",
        description="dbt --select expression, e.g. 'transforms' or 'revenue_summary+'"
    )
    target: str = Field(
        default="dev",
        description="dbt target profile name"
    )
    output_model: str = Field(
        default="",
        description="Model name to query and return as DataFrame after dbt run, e.g. 'transforms.revenue_summary'"
    )
    duckdb_path: str = Field(
        default="",
        description="Path to DuckDB file to query output_model from (if using dbt-duckdb)"
    )


class DbtTransformStep(BaseStep):
    display_name = "dbt Transform"
    type = "transform.dbt"
    description = "Run dbt models to transform raw data in your warehouse. Returns output model as DataFrame."
    icon = "layers"
    category = "transforms"
    ConfigModel = DbtTransformConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        """Run dbt in a subprocess (async-safe), then read output model back as DataFrame."""
        return await asyncio.to_thread(self._sync_run_dbt)

    def _sync_run_dbt(self) -> pd.DataFrame:
        project_dir = Path(self.config.dbt_project_dir)
        profiles_dir = Path(self.config.profiles_dir or self.config.dbt_project_dir)

        if not project_dir.exists():
            raise FileNotFoundError(f"dbt project dir not found: {project_dir}")

        elt_python = Path(self.get_elt_python())
        dbt_executable = elt_python.with_name("dbt")
        cmd = [
            str(dbt_executable if dbt_executable.exists() else elt_python), *(["run"] if dbt_executable.exists() else ["-m", "dbt.cli.main", "run"]),
            "--project-dir", str(project_dir),
            "--profiles-dir", str(profiles_dir),
            "--target", self.config.target,
        ]
        if self.config.select:
            cmd += ["--select", self.config.select]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env={
                **os.environ,
                "PYTHONUTF8": "1",
                "DAVINCIFLOW_DUCKDB_PATH": self.config.duckdb_path or "/tmp/davinciflow_cache.duckdb",
            },
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"dbt run failed (exit {result.returncode}):\n{result.stdout}\n{result.stderr}"
            )

        # If caller wants the output as a DataFrame, query it
        if self.config.output_model and self.config.duckdb_path:
            return self._read_duckdb_model(
                db_path=self.config.duckdb_path,
                model=self.config.output_model,
            )

        # Otherwise return a summary DataFrame of what ran
        return self._parse_dbt_results(result.stdout)

    def _read_duckdb_model(self, db_path: str, model: str) -> pd.DataFrame:
        try:
            import duckdb
        except ImportError as e:
            raise RuntimeError("duckdb not installed. Add 'duckdb>=0.10.0' to requirements.txt") from e

        con = duckdb.connect(db_path, read_only=True)
        try:
            return con.execute(f"SELECT * FROM {model}").df()
        finally:
            con.close()

    def _parse_dbt_results(self, stdout: str) -> pd.DataFrame:
        """Parse dbt stdout into a summary DataFrame."""
        rows = []
        for line in stdout.splitlines():
            if "OK created" in line or "ERROR" in line or "WARN" in line:
                rows.append({"dbt_log": line.strip()})
        return pd.DataFrame(rows) if rows else pd.DataFrame([{"dbt_log": "dbt run completed"}])
