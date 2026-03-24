from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.pipeline import Pipeline, PipelineRun
from app.schemas.execution import RunCreate, RunList, RunRead
from app.services.auth import ensure_websocket_auth, require_session_auth
from app.services.execution_engine import execution_broker, execution_engine

router = APIRouter(tags=["execution"])


@router.post("/api/pipelines/{pipeline_id}/run", response_model=RunRead, status_code=status.HTTP_202_ACCEPTED)
async def run_pipeline(
    pipeline_id: int,
    payload: RunCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_session_auth),
) -> RunRead:
    pipeline = await db.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    run = await execution_engine.start_run(pipeline_id=pipeline.id, pipeline_json=pipeline.pipeline_json, parameters=payload.parameters)
    return RunRead.model_validate(run)


@router.get("/api/runs/{run_id}", response_model=RunRead)
async def get_run(
    run_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_session_auth),
) -> RunRead:
    run = await db.get(PipelineRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return RunRead.model_validate(run)


@router.get("/api/runs", response_model=RunList)
async def list_runs(
    pipeline_id: int | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_session_auth),
) -> RunList:
    safe_limit = max(1, min(limit, 200))
    statement = select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(safe_limit)
    if pipeline_id is not None:
        statement = statement.where(PipelineRun.pipeline_id == pipeline_id)
    result = await db.execute(statement)
    items = result.scalars().all()
    return RunList(items=[RunRead.model_validate(item) for item in items], total=len(items))


@router.websocket("/api/runs/{run_id}/logs/ws")
async def run_logs_ws(websocket: WebSocket, run_id: int) -> None:
    if not await ensure_websocket_auth(websocket):
        return
    await websocket.accept()
    queue = await execution_broker.subscribe(run_id)
    try:
        async with execution_engine.session_factory() as session:
            run = await session.get(PipelineRun, run_id)
            if run is None:
                await websocket.send_json({"event": "error", "message": "Run not found"})
                return
            for log in run.logs or []:
                await websocket.send_json({"event": "log", "data": log})

        while True:
            event = await queue.get()
            await websocket.send_json(event)
            if event.get("event") == "status" and event.get("status") in {"completed", "failed"}:
                break
    except WebSocketDisconnect:
        pass
    finally:
        await execution_broker.unsubscribe(run_id, queue)
        await websocket.close()
