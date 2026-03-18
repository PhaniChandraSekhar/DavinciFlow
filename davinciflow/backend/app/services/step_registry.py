from __future__ import annotations

from typing import Any

from app.steps.base import BaseStep
from app.steps.sinks import CSVOutputStep, KafkaProducerStep, PostgreSQLWriterStep
from app.steps.sources import (
    CSVInputStep,
    JDBCTableStep,
    KafkaConsumerStep,
    MQTTSubscriberStep,
    RestAPIStep,
    S3InputStep,
)
from app.steps.transforms import (
    CodebookLookupStep,
    DeduplicatorStep,
    FieldMapperStep,
    FilterRowsStep,
    FlattenJSONStep,
    GroupByStep,
    NullHandlerStep,
    RuleValidatorStep,
    TypeCasterStep,
    UnitConverterStep,
)

STEP_CLASSES: list[type[BaseStep]] = [
    AirbyteSourceStep,
    CSVInputStep,
    RestAPIStep,
    JDBCTableStep,
    KafkaConsumerStep,
    S3InputStep,
    MQTTSubscriberStep,
    FieldMapperStep,
    TypeCasterStep,
    NullHandlerStep,
    FilterRowsStep,
    DeduplicatorStep,
    FlattenJSONStep,
    CodebookLookupStep,
    UnitConverterStep,
    RuleValidatorStep,
    GroupByStep,
    CSVOutputStep,
    PostgreSQLWriterStep,
    KafkaProducerStep,
]

STEP_REGISTRY: dict[str, type[BaseStep]] = {step.type: step for step in STEP_CLASSES}


def get_step_class(step_type: str) -> type[BaseStep] | None:
    return STEP_REGISTRY.get(step_type)


def build_step_catalogue() -> dict[str, list[dict[str, Any]]]:
    catalogue = {"sources": [], "transforms": [], "sinks": []}
    for step in STEP_CLASSES:
        catalogue[step.category].append(
            {
                "name": step.display_name,
                "type": step.type,
                "description": step.description,
                "icon": step.icon,
                "config_schema": step.ConfigModel.model_json_schema(),
            }
        )
    return catalogue
