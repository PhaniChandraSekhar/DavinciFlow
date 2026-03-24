from __future__ import annotations

import asyncio
import os
import re
import subprocess
from pathlib import Path

import pandas as pd
from pydantic import BaseModel, Field

from app.services.security import quote_identifier_path, resolve_safe_path
from app.steps.base import BaseStep

DBT_TIMEOUT_SECONDS = 300
DBT_TARGET_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]{0,63}$")
DBT_SELECTOR_PATTERN = re.compile(r"^[A-Za-z0-9_:@*+,\-./ ]{0,256}$")


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
        project_dir = resolve_safe_path(self.config.dbt_project_dir, purpose="read", allow_directory=True)
        profiles_dir = resolve_safe_path(
            self.config.profiles_dir or self.config.dbt_project_dir,
            purpose="read",
            allow_directory=True,
        )

        if not (project_dir / "dbt_project.yml").exists():
            raise FileNotFoundError(f"dbt project config not found: {project_dir / 'dbt_project.yml'}")
        if not (profiles_dir / "profiles.yml").exists():
            raise FileNotFoundError(f"dbt profiles config not found: {profiles_dir / 'profiles.yml'}")
        if not DBT_TARGET_PATTERN.fullmatch(self.config.target):
            raise ValueError("Invalid dbt target value")
        if self.config.select and not DBT_SELECTOR_PATTERN.fullmatch(self.config.select):
            raise ValueError("Invalid dbt --select expression")

        elt_python = Path(self.get_elt_python())
        dbt_executable = elt_python.with_name("dbt")
        duckdb_path = (
            resolve_safe_path(self.config.duckdb_path, purpose="write")
            if self.config.duckdb_path
            else resolve_safe_path("/tmp/davinciflow_cache.duckdb", purpose="write")
        )
        cmd = [
            str(dbt_executable if dbt_executable.exists() else elt_python), *(["run"] if dbt_executable.exists() else ["-m", "dbt.cli.main", "run"]),
            "--project-dir", str(project_dir),
            "--profiles-dir", str(profiles_dir),
            "--target", self.config.target,
        ]
        if self.config.select:
            cmd += ["--select", self.config.select]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=DBT_TIMEOUT_SECONDS,
                env={
                    **os.environ,
                    "PYTHONUTF8": "1",
                    "DAVINCIFLOW_DUCKDB_PATH": str(duckdb_path),
                },
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(f"dbt run timed out after {DBT_TIMEOUT_SECONDS} seconds") from exc

        if result.returncode != 0:
            raise RuntimeError(
                f"dbt run failed (exit {result.returncode}):\n{result.stdout}\n{result.stderr}"
            )

        # If caller wants the output as a DataFrame, query it
        if self.config.output_model and self.config.duckdb_path:
            return self._read_duckdb_model(
                db_path=str(duckdb_path),
                model=self.config.output_model,
            )

        # Otherwise return a summary DataFrame of what ran
        return self._parse_dbt_results(result.stdout)

    def _read_duckdb_model(self, db_path: str, model: str) -> pd.DataFrame:
        try:
            import duckdb
        except ImportError as e:
            raise RuntimeError("duckdb not installed. Add 'duckdb>=0.10.0' to requirements.txt") from e

        safe_db_path = resolve_safe_path(db_path, purpose="read")
        con = duckdb.connect(str(safe_db_path), read_only=True)
        try:
            return con.execute(f"SELECT * FROM {quote_identifier_path(model)}").df()
        finally:
            con.close()

    def _parse_dbt_results(self, stdout: str) -> pd.DataFrame:
        """Parse dbt stdout into a summary DataFrame."""
        rows = []
        for line in stdout.splitlines():
            if "OK created" in line or "ERROR" in line or "WARN" in line:
                rows.append({"dbt_log": line.strip()})
        return pd.DataFrame(rows) if rows else pd.DataFrame([{"dbt_log": "dbt run completed"}])
