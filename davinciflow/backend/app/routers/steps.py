from __future__ import annotations

from fastapi import APIRouter

from app.services.step_registry import build_step_catalogue

router = APIRouter(prefix="/api/steps", tags=["steps"])


@router.get("")
async def list_steps() -> dict[str, list[dict[str, object]]]:
    return build_step_catalogue()

