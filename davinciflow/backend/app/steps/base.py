from __future__ import annotations

from abc import ABC, abstractmethod


class BaseStep(ABC):
    step_type = "base"

    @abstractmethod
    async def run(self, payload: dict) -> dict:
        raise NotImplementedError
