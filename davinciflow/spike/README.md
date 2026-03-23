# DaVinciFlow — ELT Integration Spike

Proof-of-concept for the DaVinciFlow core pipeline:

```
source-faker (PyAirbyte) → DuckDB (raw) → dbt models (transforms) → DuckDB (clean)
```

## Quick Start

```bash
cd projects/davinciflow-spike

# Install deps
pip install -r requirements.txt

# Run the full ELT pipeline
python spike.py
```

Expected output:
- 500 fake e-commerce records extracted (products, purchases, users)
- Raw tables written to `davinciflow.duckdb` (schema: `main`)
- dbt transforms run → `revenue_summary` + `user_purchase_summary` tables
- Preview of top products by revenue + top buyers printed to terminal

## Swap the Source

Edit `config/source_config.py` → change `DEFAULT_SOURCE`:

```python
# Postgres example
DEFAULT_SOURCE = SourceConfig(
    source_name="source-postgres",
    config_dict={"host": "localhost", "port": 5432, "database": "mydb", ...},
    streams=["orders", "customers"]
)
```

PyAirbyte auto-installs the connector. 600+ sources available.

## Swap the Destination

Edit `dbt_project/profiles.yml` → change output type:

```yaml
# Postgres
outputs:
  dev:
    type: postgres
    host: localhost
    port: 5432
    ...

# BigQuery
outputs:
  dev:
    type: bigquery
    project: my-gcp-project
    ...
```

Also update `spike.py` line ~53: swap `ab.DuckDBCache()` for `ab.PostgresCache(...)` or other PyAirbyte cache.

## Project Structure

```
davinciflow-spike/
├── spike.py                          # Main ELT runner
├── requirements.txt
├── davinciflow.duckdb                # Created on first run
├── config/
│   └── source_config.py             # Source abstraction — swap here
└── dbt_project/
    ├── dbt_project.yml
    ├── profiles.yml                  # Destination config — swap here
    └── models/transforms/
        ├── schema.yml
        ├── revenue_summary.sql       # Revenue by product
        └── user_purchase_summary.sql # Top buyers
```

## Next Steps → DaVinciFlow v0.1

1. Fork DeerFlow 2.0
2. Replace research skill with `elt_skill` (wraps this spike)
3. Add React Flow canvas for visual pipeline building
4. Natural language → pipeline config via LLM
5. Add pipeline run history + lineage to DeerFlow memory
