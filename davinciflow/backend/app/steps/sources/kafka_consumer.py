from __future__ import annotations

import asyncio
import json
from typing import Any

import pandas as pd
from confluent_kafka import Consumer
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class KafkaConsumerConfig(BaseModel):
    connection: Any
    topic: str
    group_id: str
    max_records: int = Field(default=100, ge=1)


class KafkaConsumerStep(BaseStep):
    display_name = "Kafka Consumer"
    type = "source.kafka_consumer"
    description = "Consume a finite batch of Kafka messages into a DataFrame."
    icon = "radio"
    category = "sources"
    ConfigModel = KafkaConsumerConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        connection = await self.resolve_connection(self.config.connection)
        records = await asyncio.to_thread(self._consume_messages, connection)
        return pd.DataFrame(records)

    def _consume_messages(self, connection: dict[str, Any]) -> list[dict[str, Any]]:
        config = {
            "bootstrap.servers": connection["bootstrap_servers"],
            "group.id": self.config.group_id,
            "auto.offset.reset": connection.get("auto_offset_reset", "earliest"),
        }
        for source_key, target_key in (
            ("security_protocol", "security.protocol"),
            ("sasl_mechanism", "sasl.mechanism"),
            ("sasl_username", "sasl.username"),
            ("sasl_password", "sasl.password"),
            ("ssl_ca_location", "ssl.ca.location"),
        ):
            if connection.get(source_key):
                config[target_key] = connection[source_key]

        consumer = Consumer(config)
        messages: list[dict[str, Any]] = []
        idle_polls = 0
        try:
            consumer.subscribe([self.config.topic])
            while len(messages) < self.config.max_records and idle_polls < 5:
                message = consumer.poll(1.0)
                if message is None:
                    idle_polls += 1
                    continue
                if message.error():
                    raise RuntimeError(str(message.error()))
                idle_polls = 0
                value = message.value().decode("utf-8") if message.value() else ""
                parsed = self._parse_payload(value)
                record = parsed if isinstance(parsed, dict) else {"value": parsed}
                record.update(
                    {
                        "_topic": message.topic(),
                        "_partition": message.partition(),
                        "_offset": message.offset(),
                        "_timestamp": message.timestamp()[1],
                    }
                )
                messages.append(record)
        finally:
            consumer.close()
        return messages

    def _parse_payload(self, payload: str) -> Any:
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return payload
