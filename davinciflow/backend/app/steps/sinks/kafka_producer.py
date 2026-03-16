from __future__ import annotations

import asyncio
import json
from typing import Any

import pandas as pd
from confluent_kafka import Producer
from pydantic import BaseModel

from app.steps.base import BaseStep


class KafkaProducerConfig(BaseModel):
    connection: Any
    topic: str
    key_column: str | None = None


class KafkaProducerStep(BaseStep):
    display_name = "Kafka Producer"
    type = "sink.kafka_producer"
    description = "Publish DataFrame rows as Kafka messages."
    icon = "send"
    category = "sinks"
    ConfigModel = KafkaProducerConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if frame.empty:
            return frame
        connection = await self.resolve_connection(self.config.connection)
        await asyncio.to_thread(self._publish_messages, connection, frame)
        return frame

    def _publish_messages(self, connection: dict[str, Any], frame: pd.DataFrame) -> None:
        config = {"bootstrap.servers": connection["bootstrap_servers"]}
        for source_key, target_key in (
            ("security_protocol", "security.protocol"),
            ("sasl_mechanism", "sasl.mechanism"),
            ("sasl_username", "sasl.username"),
            ("sasl_password", "sasl.password"),
            ("ssl_ca_location", "ssl.ca.location"),
        ):
            if connection.get(source_key):
                config[target_key] = connection[source_key]

        producer = Producer(config)
        for record in frame.where(pd.notna(frame), None).to_dict(orient="records"):
            key = None
            if self.config.key_column and record.get(self.config.key_column) is not None:
                key = str(record[self.config.key_column]).encode("utf-8")
            producer.produce(
                self.config.topic,
                key=key,
                value=json.dumps(record, default=str).encode("utf-8"),
            )
        producer.flush()

