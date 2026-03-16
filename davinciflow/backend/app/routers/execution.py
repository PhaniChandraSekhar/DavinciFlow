from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.pipeline import Pipeline, PipelineRun
from app.schemas.execution import RunCreate, RunRead
from app.services.execution_engine import execution_broker, execution_engine

router = APIRouter(tags=["execution"])


@router.post("/api/pipelines/{pipeline_id}/run", response_model=RunRead, status_code=status.HTTP_202_ACCEPTED)
async def run_pipeline(
    pipeline_id: int,
    payload: RunCreate,
    db: AsyncSession = Depends(get_db),
) -> RunRead:
    pipeline = await db.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    run = await execution_engine.start_run(pipeline_id=pipeline.id, pipeline_json=pipeline.pipeline_json, parameters=payload.parameters)
    return RunRead.model_validate(run)


@router.get("/api/runs/{run_id}", response_model=RunRead)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)) -> RunRead:
    run = await db.get(PipelineRun, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return RunRead.model_validate(run)


@router.websocket("/api/runs/{run_id}/logs/ws")
async def run_logs_ws(websocket: WebSocket, run_id: int) -> None:
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

