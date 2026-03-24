from __future__ import annotations

import asyncio
import sqlite3
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from app.config import Settings
from app.services.dataframe_filters import UnsafeExpressionError, filter_dataframe
from app.services.passwords import hash_password, verify_password
from app.services.security import validate_outbound_url
from app.steps.sources.jdbc_table import JDBCTableStep


def test_filter_dataframe_supports_safe_boolean_expression() -> None:
    frame = pd.DataFrame(
        [
            {"status": "active", "amount": 15},
            {"status": "inactive", "amount": 25},
            {"status": "active", "amount": 30},
        ]
    )

    filtered = filter_dataframe(frame, "status == 'active' and amount >= 20")

    assert filtered["amount"].tolist() == [30]


def test_filter_dataframe_rejects_function_calls() -> None:
    frame = pd.DataFrame([{"amount": 15}])

    with pytest.raises(UnsafeExpressionError):
        filter_dataframe(frame, "__import__('os').system('whoami')")


def test_validate_outbound_url_blocks_localhost() -> None:
    with pytest.raises(ValueError, match="blocked"):
        validate_outbound_url("http://127.0.0.1:8000/health")


def test_password_hash_round_trip() -> None:
    hashed = hash_password("super-secret-password")

    assert hashed.startswith("scrypt$")
    assert verify_password("super-secret-password", hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_settings_require_hashed_password_outside_development(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DAVINCIFLOW_ENVIRONMENT", "production")
    monkeypatch.setenv("DAVINCIFLOW_AUTH_ENABLED", "true")
    monkeypatch.setenv("DAVINCIFLOW_ADMIN_USERNAME", "admin")
    monkeypatch.setenv("DAVINCIFLOW_ADMIN_PASSWORD", "plaintext-password")
    monkeypatch.setenv("DAVINCIFLOW_SESSION_SECRET", "prod-session-secret")
    monkeypatch.setenv("DAVINCIFLOW_ENCRYPTION_KEY", "prod-encryption-secret")
    monkeypatch.setenv("DAVINCIFLOW_CORS_ORIGINS", "https://app.example.com")

    with pytest.raises(ValueError, match="password hash"):
        Settings(_env_file=None)


def test_jdbc_table_step_rejects_invalid_table_identifier() -> None:
    step = JDBCTableStep(
        config={
            "connection": {"url": "sqlite+aiosqlite:///ignored.db"},
            "table": "records; DROP TABLE records",
        }
    )

    with pytest.raises(ValueError, match="Invalid identifier"):
        asyncio.run(step.execute(None))


def test_jdbc_table_step_applies_safe_where_clause_after_query() -> None:
    db_path = Path(tempfile.gettempdir()) / "davinciflow-jdbc-security.db"
    if db_path.exists():
        db_path.unlink()

    with sqlite3.connect(db_path) as connection:
        connection.execute("CREATE TABLE records (id INTEGER PRIMARY KEY, amount INTEGER NOT NULL)")
        connection.executemany("INSERT INTO records (amount) VALUES (?)", [(5,), (15,), (25,)])
        connection.commit()

    step = JDBCTableStep(
        config={
            "connection": {"url": f"sqlite+aiosqlite:///{db_path.as_posix()}"},
            "table": "records",
            "where_clause": "amount >= 15",
        }
    )

    frame = asyncio.run(step.execute(None))

    assert frame["amount"].tolist() == [15, 25]


def test_pipeline_create_rejects_invalid_pipeline_json_shape(client) -> None:
    response = client.post(
        "/api/pipelines",
        json={
            "name": "Bad Pipeline",
            "description": None,
            "pipeline_json": {"nodes": [], "edges": [], "unexpected": True},
        },
    )

    assert response.status_code == 422


def test_run_logs_websocket_accepts_authenticated_session(client) -> None:
    with client.websocket_connect("/api/runs/999/logs/ws") as websocket:
        payload = websocket.receive_json()

    assert payload == {"event": "error", "message": "Run not found"}
