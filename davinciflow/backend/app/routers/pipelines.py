from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.pipeline import Pipeline, PipelineRun
from app.schemas.pipeline import PipelineCreate, PipelineList, PipelineRead

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])


async def _latest_runs_by_pipeline(db: AsyncSession) -> dict[int, PipelineRun]:
    result = await db.execute(select(PipelineRun).order_by(PipelineRun.pipeline_id, PipelineRun.started_at.desc()))
    latest_runs: dict[int, PipelineRun] = {}
    for run in result.scalars():
        latest_runs.setdefault(run.pipeline_id, run)
    return latest_runs


def _to_pipeline_read(pipeline: Pipeline, latest_run: PipelineRun | None = None) -> PipelineRead:
    payload = PipelineRead.model_validate(pipeline).model_dump()
    payload["latest_run_status"] = latest_run.status if latest_run is not None else None
    payload["latest_run_at"] = (
        latest_run.completed_at or latest_run.started_at if latest_run is not None else None
    )
    return PipelineRead.model_validate(payload)


@router.get("", response_model=PipelineList)
async def list_pipelines(db: AsyncSession = Depends(get_db)) -> PipelineList:
    result = await db.execute(select(Pipeline).order_by(Pipeline.created_at.desc()))
    items = result.scalars().all()
    latest_runs = await _latest_runs_by_pipeline(db)
    return PipelineList(
        items=[_to_pipeline_read(item, latest_runs.get(item.id)) for item in items],
        total=len(items),
    )


@router.post("", response_model=PipelineRead, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    payload: PipelineCreate, db: AsyncSession = Depends(get_db)
) -> PipelineRead:
    pipeline = Pipeline(**payload.model_dump())
    db.add(pipeline)
    await db.commit()
    await db.refresh(pipeline)
    return PipelineRead.model_validate(pipeline)


@router.get("/{pipeline_id}", response_model=PipelineRead)
async def get_pipeline(pipeline_id: int, db: AsyncSession = Depends(get_db)) -> PipelineRead:
    pipeline = await db.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    latest_runs = await _latest_runs_by_pipeline(db)
    return _to_pipeline_read(pipeline, latest_runs.get(pipeline.id))


@router.put("/{pipeline_id}", response_model=PipelineRead)
async def update_pipeline(
    pipeline_id: int, payload: PipelineCreate, db: AsyncSession = Depends(get_db)
) -> PipelineRead:
    pipeline = await db.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    for field, value in payload.model_dump().items():
        setattr(pipeline, field, value)
    await db.commit()
    await db.refresh(pipeline)
    latest_runs = await _latest_runs_by_pipeline(db)
    return _to_pipeline_read(pipeline, latest_runs.get(pipeline.id))


@router.delete("/{pipeline_id}", status_code=status.HTTP_200_OK)
async def delete_pipeline(pipeline_id: int, db: AsyncSession = Depends(get_db)) -> None:
    pipeline = await db.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    await db.delete(pipeline)
    await db.commit()


