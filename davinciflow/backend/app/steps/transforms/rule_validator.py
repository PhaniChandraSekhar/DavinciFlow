from __future__ import annotations

import re
from typing import Any, Literal

import pandas as pd
from pydantic import BaseModel, Field

from app.steps.base import BaseStep


class ValidationRule(BaseModel):
    field: str
    rule_type: Literal["not_null", "equals", "greater_than", "less_than", "in_set", "regex"]
    value: Any = None


class RuleValidatorConfig(BaseModel):
    rules: list[ValidationRule] = Field(default_factory=list)


class RuleValidatorStep(BaseStep):
    display_name = "Rule Validator"
    type = "transform.rule_validator"
    description = "Apply data quality rules and mark rows as valid or invalid."
    icon = "shield-check"
    category = "transforms"
    ConfigModel = RuleValidatorConfig

    async def execute(self, df: pd.DataFrame | None) -> pd.DataFrame:
        frame = self.ensure_dataframe(df)
        if frame.empty or not self.config.rules:
            frame["quality_status"] = "valid"
            return frame

        status_mask = pd.Series(True, index=frame.index)
        for rule in self.config.rules:
            if rule.field not in frame.columns:
                status_mask &= False
                continue

            series = frame[rule.field]
            if rule.rule_type == "not_null":
                status_mask &= series.notna()
            elif rule.rule_type == "equals":
                status_mask &= series == rule.value
            elif rule.rule_type == "greater_than":
                status_mask &= pd.to_numeric(series, errors="coerce") > float(rule.value)
            elif rule.rule_type == "less_than":
                status_mask &= pd.to_numeric(series, errors="coerce") < float(rule.value)
            elif rule.rule_type == "in_set":
                values = rule.value if isinstance(rule.value, list) else [rule.value]
                status_mask &= series.isin(values)
            elif rule.rule_type == "regex":
                pattern = re.compile(str(rule.value))
                status_mask &= series.fillna("").astype(str).apply(lambda item: bool(pattern.search(item)))

        frame["quality_status"] = status_mask.map({True: "valid", False: "invalid"})
        return frame

