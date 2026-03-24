```text
 ____             _            _ _____ _
|  _ \  __ ___   _(_)_ __   ___| |  ___| | _____      __
| | | |/ _` \ \ / / | '_ \ / __| | |_  | |/ _ \ \ /\ / /
| |_| | (_| |\ V /| | | | | (__| |  _| | | (_) \ V  V /
|____/ \__,_| \_/ |_|_| |_|\___|_|_|   |_|\___/ \_/\_/
```

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688.svg)](https://fastapi.tiangolo.com/)

Visual ELT pipeline designer for on-premise and edge environments.

## Architecture

```text
+--------------------+        +------------------------+
| Browser UI         | <----> | FastAPI Backend        |
| React + ReactFlow  |        | API + Orchestration    |
+--------------------+        +-----------+------------+
                                           |
                 +-------------------------+--------------------------+
                 |                         |                          |
                 v                         v                          v
        +----------------+        +----------------+        +----------------+
        | PostgreSQL     |        | MinIO          |        | Kafka          |
        | Metadata store |        | Artifact store |        | Event stream   |
        +----------------+        +----------------+        +----------------+
                                                                      |
                                                                      v
                                                            +----------------+
                                                            | TimescaleDB    |
                                                            | Metrics store  |
                                                            +----------------+
```

## Quick Start

1. Clone the repository.
2. Copy the environment template with `cp .env.example .env`.
3. Start the stack with `docker compose up --build`.
4. Open `http://localhost:3000` in your browser.
5. Sign in with the admin credentials from `.env`.
6. Create your first pipeline on the visual canvas and save it.

## Features

- Visual canvas powered by ReactFlow for drag-and-connect ELT design.
- 18+ built-in steps for ingestion, validation, branching, loading, and scheduling.
- 6 connector types covering databases, filesystems, object stores, APIs, queues, and streams.
- 6 transform models including SQL, Python, mapping, aggregation, enrichment, and rule-based transforms.
- Execution engine for versioned pipeline runs with logs and run state tracking.
- Connection manager for reusable, secret-backed integration definitions.
- Cookie-based admin authentication for protected API and UI access.

## Runtime Configuration

- `AUTH_ENABLED=true` protects all `/api/*` routes except `/api/auth/*`.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` define the bootstrap admin login.
- `SESSION_SECRET` signs the session cookie and must be unique in every deployed environment.
- `SECURE_COOKIES=true` should be used behind HTTPS in production.
- When auth is enabled, `CORS_ORIGINS` must be an explicit allowlist, not `*`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React + TypeScript + ReactFlow |
| Backend | FastAPI + Python |
| Database | PostgreSQL |
| Object Storage | MinIO |
| Orchestration | Airflow |

## Adding a Custom Step

Create a new step by extending `BaseStep` and returning a serializable payload from `run`.

```python
from app.steps.base import BaseStep


class NormalizeCustomerStep(BaseStep):
    step_type = "normalize_customer"

    async def run(self, payload: dict) -> dict:
        rows = payload.get("rows", [])
        normalized = []
        for row in rows:
            normalized.append(
                {
                    "customer_id": str(row["customer_id"]).strip(),
                    "email": row["email"].lower().strip(),
                }
            )

        return {
            "rows": normalized,
            "row_count": len(normalized),
        }
```

## API Endpoints

- `GET /health` - liveness probe for local development and container health checks.
- `GET /health/ready` - readiness probe that verifies database connectivity.
- `GET /api/auth/session` - inspect current authentication state.
- `POST /api/auth/login` - create an authenticated admin session.
- `GET /api/pipelines` - list available pipelines.
- `POST /api/pipelines` - create a new pipeline draft.
- `GET /api/connections` - list registered source and sink connections with secrets redacted.
- `POST /api/connections` - create a reusable connection profile.
- `GET /api/runs` - inspect recent pipeline run history.
- `POST /api/pipelines/{pipeline_id}/run` - enqueue a pipeline run.

## Contributing

1. Fork the repository and create a feature branch.
2. Run `make build` and `make up` before opening a pull request.
3. Apply database changes through Alembic migrations.
4. Add tests for backend behavior and UI changes where appropriate.
5. Keep documentation and example payloads in sync with the API.

## License

DavinciFlow is licensed under the Apache License 2.0. See [LICENSE](./LICENSE).
