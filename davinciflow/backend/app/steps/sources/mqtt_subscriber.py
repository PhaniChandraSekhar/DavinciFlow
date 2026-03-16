from __future__ import annotations

import asyncio
import json
import threading
from datetime import UTC, datetime
from typing import Any

import pandas as pd
import paho.mqtt.client as mqtt
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class MQTTSubscriberConfig(BaseModel):
    connection: Any
    topic: str
    message_count: int = Field(default=10, ge=1)


class MQTTSubscriberStep(BaseStep):
    display_name = "MQTT Subscriber"
    type = "source.mqtt_subscriber"
    description = "Subscribe to an MQTT topic and capture a bounded batch of messages."
    icon = "antenna"
    category = "sources"
    ConfigModel = MQTTSubscriberConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        connection = await self.resolve_connection(self.config.connection)
        records = await asyncio.to_thread(self._collect_messages, connection)
        return pd.DataFrame(records)

    def _collect_messages(self, connection: dict[str, Any]) -> list[dict[str, Any]]:
        messages: list[dict[str, Any]] = []
        completed = threading.Event()
        timeout_seconds = int(connection.get("timeout_seconds", 15))

        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        if connection.get("username"):
            client.username_pw_set(connection["username"], connection.get("password"))

        def on_connect(
            client: mqtt.Client,
            userdata: Any,
            flags: dict[str, Any],
            reason_code: mqtt.ReasonCode,
            properties: Any,
        ) -> None:
            if reason_code.is_failure:
                completed.set()
                raise RuntimeError(f"MQTT connection failed: {reason_code}")
            client.subscribe(self.config.topic)

        def on_message(client: mqtt.Client, userdata: Any, message: mqtt.MQTTMessage) -> None:
            payload = message.payload.decode("utf-8")
            parsed = self._parse_payload(payload)
            record = parsed if isinstance(parsed, dict) else {"value": parsed}
            record.update(
                {
                    "_topic": message.topic,
                    "_qos": message.qos,
                    "_received_at": datetime.now(UTC).isoformat(),
                }
            )
            messages.append(record)
            if len(messages) >= self.config.message_count:
                completed.set()

        client.on_connect = on_connect
        client.on_message = on_message

        host = connection.get("host", "localhost")
        port = int(connection.get("port", 1883))
        keepalive = int(connection.get("keepalive", 60))

        client.connect(host, port, keepalive=keepalive)
        client.loop_start()
        completed.wait(timeout=timeout_seconds)
        client.loop_stop()
        client.disconnect()
        return messages

    def _parse_payload(self, payload: str) -> Any:
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return payload
