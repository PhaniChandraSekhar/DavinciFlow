from __future__ import annotations

from abc import ABC, abstractmethod
import os
import sys
from typing import Any

import pandas as pd
from pydantic import BaseModel

from app.models.connection import Connection
from app.services.connection_crypto import decrypt_connection_config


class BaseStep(ABC):
    display_name = "Base Step"
    type = "base"
    description = ""
    icon = "box"
    category = "transforms"
    ConfigModel = BaseModel

    def __init__(self, config: dict[str, Any] | None = None, context: dict[str, Any] | None = None) -> None:
        self.context = context or {}
        self.raw_config = config or {}
        self.config = self.ConfigModel.model_validate(self.raw_config)

    @abstractmethod
    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        raise NotImplementedError

    def ensure_dataframe(self, df: pd.DataFrame | None) -> pd.DataFrame:
        if df is None:
            return pd.DataFrame()
        if isinstance(df, pd.DataFrame):
            return df.copy()
        raise TypeError(f"Expected pandas DataFrame or None, got {type(df).__name__}")

    def get_elt_python(self) -> str:
        configured = os.getenv("DAVINCIFLOW_ELT_PYTHON") or os.getenv("ELT_PYTHON")
        if configured:
            return configured
        if sys.platform != "win32":
            return "/opt/davinciflow-elt/bin/python"
        return sys.executable

    async def resolve_connection(self, connection: Any) -> dict[str, Any]:
        if isinstance(connection, dict):
            nested_config = connection.get("config")
            if isinstance(nested_config, dict):
                return {
                    **nested_config,
                    "id": connection.get("id"),
                    "name": connection.get("name"),
                    "type": connection.get("type"),
                }
            if "id" in connection:
                return await self.resolve_connection(connection["id"])
            return connection

        if connection is None or connection == "":
            raise ValueError("Connection reference is required")

        session_factory = self.context.get("session_factory")
        if session_factory is None:
            raise RuntimeError("Step context missing session_factory; cannot resolve connection")

        try:
            connection_id = int(connection)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Unsupported connection reference: {connection!r}") from exc

        async with session_factory() as session:
            model = await session.get(Connection, connection_id)

        if model is None:
            raise ValueError(f"Connection '{connection_id}' not found")

        return {
            **decrypt_connection_config(model.config or {}),
            "id": model.id,
            "name": model.name,
            "type": model.type,
        }
