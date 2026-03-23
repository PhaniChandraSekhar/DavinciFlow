"""
DaVinciFlow — ELT Integration Spike
=====================================
Demonstrates the full ELT pipeline:
  Extract  → PyAirbyte (source-faker, no credentials needed)
  Load     → DuckDB    (local file, zero setup)
  Transform → dbt-duckdb (SQL models, run programmatically)

To swap the source: edit config/source_config.py → change DEFAULT_SOURCE
To swap the destination: edit dbt_project/profiles.yml → change output type
"""

import subprocess
import sys
import os
from pathlib import Path

# ── ensure we can import local config ──────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
from config.source_config import DEFAULT_SOURCE

DB_FILE = Path(__file__).parent / "davinciflow.duckdb"
DBT_PROJECT_DIR = Path(__file__).parent / "dbt_project"
DBT_PROFILES_DIR = DBT_PROJECT_DIR  # profiles.yml lives inside dbt_project/


def step_banner(step: str, title: str):
    print(f"\n{'='*60}")
    print(f"  {step}  {title}")
    print(f"{'='*60}")


# ══════════════════════════════════════════════════════════════
# STEP 1 — EXTRACT + LOAD  (PyAirbyte)
# ══════════════════════════════════════════════════════════════
def extract_and_load():
    step_banner("⬇ E+L", "Extract & Load via PyAirbyte")

    try:
        import airbyte as ab
    except ImportError:
        print("❌  PyAirbyte not installed. Run: pip install airbyte")
        sys.exit(1)

    source_cfg = DEFAULT_SOURCE
    print(f"  Source  : {source_cfg.source_name}")
    print(f"  Streams : {source_cfg.streams}")
    print(f"  Dest    : DuckDB → {DB_FILE}")
    print()

    # Build source
    source = ab.get_source(
        source_cfg.source_name,
        config=source_cfg.config_dict,
        streams=source_cfg.streams,
        install_if_missing=True,
    )

    source.check()
    print("  ✅ Source connection check passed")

    # Read into cache (DuckDB-backed by default)
    # To swap destination: replace ab.DuckDBCache() with ab.PostgresCache(...) etc.
    cache = ab.DuckDBCache(db_path=str(DB_FILE))
    result = source.read(cache=cache)

    print("\n  📦 Loaded streams:")
    total_rows = 0
    for stream_name, dataset in result.cache.streams.items():
        try:
            df = dataset.to_pandas()
            rows = len(df)
            total_rows += rows
            print(f"     {stream_name:25s} → {rows:>5} rows")
        except Exception as e:
            print(f"     {stream_name:25s} → (error reading: {e})")

    print(f"\n  Total rows loaded: {total_rows}")
    return result


# ══════════════════════════════════════════════════════════════
# STEP 2 — TRANSFORM  (dbt)
# ══════════════════════════════════════════════════════════════
def run_dbt_transforms():
    step_banner("🔄 T", "Transform via dbt")

    if not DBT_PROJECT_DIR.exists():
        print(f"❌  dbt project not found at {DBT_PROJECT_DIR}")
        sys.exit(1)

    print(f"  dbt project : {DBT_PROJECT_DIR}")
    print(f"  profiles    : {DBT_PROFILES_DIR}")
    print()

    cmd = [
        sys.executable, "-m", "dbt", "run",
        "--project-dir", str(DBT_PROJECT_DIR),
        "--profiles-dir", str(DBT_PROFILES_DIR),
        "--select", "transforms",
    ]

    print(f"  Running: {' '.join(cmd)}\n")
    result = subprocess.run(cmd, capture_output=False, text=True)

    if result.returncode != 0:
        print(f"\n❌  dbt run failed (exit code {result.returncode})")
        print("    Check the output above for model errors.")
        sys.exit(result.returncode)

    print("\n  ✅ dbt transforms complete")


# ══════════════════════════════════════════════════════════════
# STEP 3 — PREVIEW  (DuckDB direct query)
# ══════════════════════════════════════════════════════════════
def preview_results():
    step_banner("👁  Preview", "Transform output")

    try:
        import duckdb
    except ImportError:
        print("❌  duckdb not installed. Run: pip install duckdb")
        return

    con = duckdb.connect(str(DB_FILE))

    models = ["transforms.revenue_summary", "transforms.user_purchase_summary"]
    for model in models:
        print(f"\n  📊 {model} (top 5):")
        try:
            df = con.execute(f"SELECT * FROM {model} LIMIT 5").df()
            print(df.to_string(index=False))
        except Exception as e:
            print(f"     (could not query {model}: {e})")

    con.close()


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\n🎯  DaVinciFlow ELT Spike")
    print(f"    DB : {DB_FILE}")

    extract_and_load()
    run_dbt_transforms()
    preview_results()

    print("\n\n✅  Spike complete.")
    print("    Next: wire this as a DeerFlow skill → DaVinciFlow v0.1")
    print(f"    Raw data  : {DB_FILE} (schema: main)")
    print(f"    Transforms: {DB_FILE} (schema: transforms)")
