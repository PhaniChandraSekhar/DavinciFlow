"""
DaVinciFlow — Source Configuration

Swap any source by changing the values below.
The SourceConfig dataclass is the single place to define:
  - which PyAirbyte connector to use
  - its credentials/config dict
  - which streams (tables) to extract

Examples of other sources (uncomment to use):

# Postgres source:
# SourceConfig(
#     source_name="source-postgres",
#     config_dict={
#         "host": "localhost", "port": 5432,
#         "database": "mydb", "username": "user", "password": "pass",
#         "schemas": ["public"]
#     },
#     streams=["orders", "customers"]
# )

# Shopify source:
# SourceConfig(
#     source_name="source-shopify",
#     config_dict={"shop": "myshop.myshopify.com", "credentials": {"auth_method": "api_password", "api_password": "..."}},
#     streams=["orders", "products", "customers"]
# )

# CSV / local file source:
# SourceConfig(
#     source_name="source-file",
#     config_dict={"dataset_name": "orders", "format": {"filetype": "csv"}, "url": "/path/to/file.csv", "provider": {"storage": "local"}},
#     streams=["orders"]
# )
"""

from dataclasses import dataclass, field


@dataclass
class SourceConfig:
    source_name: str
    config_dict: dict
    streams: list[str]


# ─────────────────────────────────────────────
# DEFAULT: source-faker (no credentials needed)
# Generates fake e-commerce data for local dev/testing.
# ─────────────────────────────────────────────
DEFAULT_SOURCE = SourceConfig(
    source_name="source-faker",
    config_dict={
        "count": 500,        # number of fake records per stream
        "seed": 42,          # fixed seed for reproducibility
        "parallelism": 1,
    },
    streams=["products", "purchases", "users"],
)
