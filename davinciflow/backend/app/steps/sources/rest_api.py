from __future__ import annotations

from typing import Any, Literal

import httpx
import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class RestAPIConfig(BaseModel):
    url: str
    method: str = "GET"
    auth_type: Literal["none", "bearer", "api_key"] = "none"
    auth_token: str | None = None
    pagination_type: Literal["none", "page", "offset"] = "none"
    page_size: int = Field(default=100, ge=1)


class RestAPIStep(BaseStep):
    display_name = "REST API"
    type = "source.rest_api"
    description = "Fetch JSON records from an HTTP API with optional pagination."
    icon = "globe"
    category = "sources"
    ConfigModel = RestAPIConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        headers: dict[str, str] = {}
        if self.config.auth_token:
            if self.config.auth_type == "bearer":
                headers["Authorization"] = f"Bearer {self.config.auth_token}"
            elif self.config.auth_type == "api_key":
                headers["X-API-Key"] = self.config.auth_token

        records: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            if self.config.pagination_type == "none":
                payload = await self._request_page(client, headers, {})
                records.extend(self._extract_records(payload))
            elif self.config.pagination_type == "page":
                page = 1
                while True:
                    payload = await self._request_page(
                        client,
                        headers,
                        {"page": page, "page_size": self.config.page_size, "limit": self.config.page_size},
                    )
                    page_records = self._extract_records(payload)
                    if not page_records:
                        break
                    records.extend(page_records)
                    if len(page_records) < self.config.page_size:
                        break
                    page += 1
            else:
                offset = 0
                while True:
                    payload = await self._request_page(
                        client,
                        headers,
                        {"offset": offset, "page_size": self.config.page_size, "limit": self.config.page_size},
                    )
                    page_records = self._extract_records(payload)
                    if not page_records:
                        break
                    records.extend(page_records)
                    if len(page_records) < self.config.page_size:
                        break
                    offset += self.config.page_size

        return pd.json_normalize(records) if records else pd.DataFrame()

    async def _request_page(
        self,
        client: httpx.AsyncClient,
        headers: dict[str, str],
        params: dict[str, Any],
    ) -> Any:
        response = await client.request(
            method=self.config.method.upper(),
            url=self.config.url,
            headers=headers,
            params=params,
        )
        response.raise_for_status()
        return response.json()

    def _extract_records(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return [item if isinstance(item, dict) else {"value": item} for item in payload]
        if isinstance(payload, dict):
            for key in ("data", "results", "items", "records"):
                if isinstance(payload.get(key), list):
                    return [
                        item if isinstance(item, dict) else {"value": item}
                        for item in payload[key]
                    ]
            return [payload]
        return [{"value": payload}]

