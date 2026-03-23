from __future__ import annotations
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.pipeline import Pipeline
from app.schemas.pipeline import PipelineCreate, PipelineList, PipelineRead

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])


@router.get("", response_model=PipelineList)
async def list_pipelines(db: AsyncSession = Depends(get_db)) -> PipelineList:
    result = await db.execute(select(Pipeline).order_by(Pipeline.created_at.desc()))
    items = result.scalars().all()
    return PipelineList(items=[PipelineRead.model_validate(item) for item in items], total=len(items))


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
async def get_pipeline(pipeline_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> PipelineRead:
    pipeline = await db.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    return PipelineRead.model_validate(pipeline)


@router.put("/{pipeline_id}", response_model=PipelineRead)
async def update_pipeline(
    pipeline_id: uuid.UUID, payload: PipelineCreate, db: AsyncSession = Depends(get_db)
) -> PipelineRead:
    pipeline = await db.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    for field, value in payload.model_dump().items():
        setattr(pipeline, field, value)
    await db.commit()
    await db.refresh(pipeline)
    return PipelineRead.model_validate(pipeline)


@router.delete("/{pipeline_id}", status_code=status.HTTP_200_OK)
async def delete_pipeline(pipeline_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    pipeline = await db.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    await db.delete(pipeline)
    await db.commit()


