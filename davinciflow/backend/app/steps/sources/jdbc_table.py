from __future__ import annotations

from typing import Any

import pandas as pd
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.services.dataframe_filters import filter_dataframe
from app.services.security import quote_identifier_path
from app.steps.base import BaseStep


class JDBCTableConfig(BaseModel):
    connection: Any
    table: str
    where_clause: str | None = None
    watermark_column: str | None = None
    watermark_value: str | None = None


class JDBCTableStep(BaseStep):
    display_name = "JDBC Table"
    type = "source.jdbc_table"
    description = "Load rows from a database table via SQLAlchemy."
    icon = "database"
    category = "sources"
    ConfigModel = JDBCTableConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        connection = await self.resolve_connection(self.config.connection)
        connection_url = connection.get("url") or connection.get("database_url")
        if not connection_url:
            raise ValueError("Connection config must include 'url' or 'database_url'")

        clauses: list[str] = []
        params: dict[str, Any] = {}
        if self.config.watermark_column and self.config.watermark_value is not None:
            clauses.append(f"{quote_identifier_path(self.config.watermark_column)} >= :watermark_value")
            params["watermark_value"] = self.config.watermark_value

        query = f"SELECT * FROM {quote_identifier_path(self.config.table)}"
        if clauses:
            query = f"{query} WHERE {' AND '.join(clauses)}"

        engine = create_async_engine(connection_url, future=True)
        try:
            async with engine.connect() as conn:
                result = await conn.execute(text(query), params)
                rows = result.mappings().all()
                frame = pd.DataFrame(rows)
                if self.config.where_clause and not frame.empty:
                    frame = filter_dataframe(frame, self.config.where_clause)
                return frame
        finally:
            await engine.dispose()
