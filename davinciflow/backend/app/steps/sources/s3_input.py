from __future__ import annotations

import asyncio
import io
import json
from typing import Any, Literal

import boto3
import pandas as pd
from minio import Minio
from pydantic import BaseModel

from app.steps.base import BaseStep


class S3InputConfig(BaseModel):
    connection: Any
    bucket: str
    prefix: str = ""
    file_format: Literal["csv", "json", "parquet"] = "csv"


class S3InputStep(BaseStep):
    display_name = "S3 Input"
    type = "source.s3_input"
    description = "Read files from S3 or MinIO into a DataFrame."
    icon = "cloud"
    category = "sources"
    ConfigModel = S3InputConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        connection = await self.resolve_connection(self.config.connection)
        return await asyncio.to_thread(self._read_objects, connection)

    def _read_objects(self, connection: dict[str, Any]) -> pd.DataFrame:
        provider = str(connection.get("provider", "s3")).lower()
        frames: list[pd.DataFrame] = []

        if provider == "minio":
            client = Minio(
                endpoint=connection["endpoint"],
                access_key=connection["access_key"],
                secret_key=connection["secret_key"],
                secure=bool(connection.get("secure", False)),
            )
            for obj in client.list_objects(self.config.bucket, prefix=self.config.prefix, recursive=True):
                response = client.get_object(self.config.bucket, obj.object_name)
                try:
                    frames.append(self._load_payload(response.read()))
                finally:
                    response.close()
                    response.release_conn()
        else:
            client = boto3.client(
                "s3",
                endpoint_url=connection.get("endpoint_url"),
                aws_access_key_id=connection.get("access_key"),
                aws_secret_access_key=connection.get("secret_key"),
                region_name=connection.get("region"),
            )
            continuation_token: str | None = None
            while True:
                kwargs: dict[str, Any] = {"Bucket": self.config.bucket, "Prefix": self.config.prefix}
                if continuation_token:
                    kwargs["ContinuationToken"] = continuation_token
                response = client.list_objects_v2(**kwargs)
                for entry in response.get("Contents", []):
                    body = client.get_object(Bucket=self.config.bucket, Key=entry["Key"])["Body"].read()
                    frames.append(self._load_payload(body))
                if not response.get("IsTruncated"):
                    break
                continuation_token = response.get("NextContinuationToken")

        return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    def _load_payload(self, payload: bytes) -> pd.DataFrame:
        if self.config.file_format == "csv":
            return pd.read_csv(io.BytesIO(payload))
        if self.config.file_format == "parquet":
            return pd.read_parquet(io.BytesIO(payload))
        data = json.loads(payload.decode("utf-8"))
        if isinstance(data, list):
            return pd.json_normalize(data)
        return pd.json_normalize([data])

