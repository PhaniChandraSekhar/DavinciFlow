from __future__ import annotations

from typing import Any, Literal

import pandas as pd
from pydantic import BaseModel
from sqlalchemy import JSON, Boolean, Column, DateTime, Float, MetaData, Table, Text, inspect
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import create_async_engine

from app.steps.base import BaseStep


class PostgreSQLWriterConfig(BaseModel):
    connection: Any
    table: str
    if_exists: Literal["append", "replace", "upsert"] = "append"


class PostgreSQLWriterStep(BaseStep):
    display_name = "PostgreSQL Writer"
    type = "sink.postgresql_writer"
    description = "Persist rows into PostgreSQL using SQLAlchemy."
    icon = "database-up"
    category = "sinks"
    ConfigModel = PostgreSQLWriterConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if frame.empty:
            return frame

        connection = await self.resolve_connection(self.config.connection)
        connection_url = connection.get("url") or connection.get("database_url")
        if not connection_url:
            raise ValueError("Connection config must include 'url' or 'database_url'")

        schema, table_name = self._split_table_name(self.config.table)
        engine = create_async_engine(connection_url, future=True)
        try:
            async with engine.begin() as conn:
                table_exists = await conn.run_sync(
                    lambda sync_conn: inspect(sync_conn).has_table(table_name, schema=schema)
                )
                if self.config.if_exists == "replace" and table_exists:
                    await conn.run_sync(self._drop_table, schema, table_name)
                    table_exists = False

                if not table_exists:
                    await conn.run_sync(self._create_table_from_frame, frame, schema, table_name)

                table = await conn.run_sync(self._reflect_table, schema, table_name)
                records = frame.where(pd.notna(frame), None).to_dict(orient="records")
                if not records:
                    return frame

                if self.config.if_exists == "upsert":
                    primary_keys = [column.name for column in table.primary_key.columns]
                    if primary_keys:
                        statement = pg_insert(table).values(records)
                        updates = {
                            column.name: statement.excluded[column.name]
                            for column in table.columns
                            if column.name not in primary_keys
                        }
                        statement = statement.on_conflict_do_update(
                            index_elements=primary_keys,
                            set_=updates,
                        )
                        await conn.execute(statement)
                    else:
                        await conn.execute(table.insert(), records)
                else:
                    await conn.execute(table.insert(), records)
            return frame
        finally:
            await engine.dispose()

    def _split_table_name(self, value: str) -> tuple[str | None, str]:
        if "." not in value:
            return None, value
        schema, table_name = value.split(".", 1)
        return schema, table_name

    def _reflect_table(self, sync_conn, schema: str | None, table_name: str) -> Table:
        metadata = MetaData()
        return Table(table_name, metadata, schema=schema, autoload_with=sync_conn)

    def _drop_table(self, sync_conn, schema: str | None, table_name: str) -> None:
        metadata = MetaData()
        table = Table(table_name, metadata, schema=schema, autoload_with=sync_conn)
        table.drop(sync_conn, checkfirst=True)

    def _create_table_from_frame(self, sync_conn, frame: pd.DataFrame, schema: str | None, table_name: str) -> None:
        metadata = MetaData(schema=schema)
        columns = []
        for column_name in frame.columns:
            series = frame[column_name]
            primary_key = column_name == "id" and series.notna().is_unique
            columns.append(
                Column(
                    column_name,
                    self._infer_sqlalchemy_type(series),
                    primary_key=primary_key,
                    nullable=not primary_key,
                )
            )
        table = Table(table_name, metadata, *columns, schema=schema)
        table.create(sync_conn, checkfirst=True)

    def _infer_sqlalchemy_type(self, series: pd.Series):
        if pd.api.types.is_integer_dtype(series):
            from sqlalchemy import Integer

            return Integer()
        if pd.api.types.is_float_dtype(series):
            return Float()
        if pd.api.types.is_bool_dtype(series):
            return Boolean()
        if pd.api.types.is_datetime64_any_dtype(series):
            return DateTime(timezone=True)
        if series.map(lambda item: isinstance(item, (dict, list))).any():
            return JSON()
        return Text()

