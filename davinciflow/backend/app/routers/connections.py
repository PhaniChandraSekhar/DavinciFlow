from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.connection import Connection
from app.schemas.connection import ConnectionCreate, ConnectionRead

router = APIRouter(prefix="/api/connections", tags=["connections"])


@router.get("", response_model=list[ConnectionRead])
async def list_connections(db: AsyncSession = Depends(get_db)) -> list[ConnectionRead]:
    result = await db.execute(select(Connection).order_by(Connection.created_at.desc()))
    items = result.scalars().all()
    return [ConnectionRead.model_validate(item) for item in items]


@router.post("", response_model=ConnectionRead, status_code=status.HTTP_201_CREATED)
async def create_connection(
    payload: ConnectionCreate, db: AsyncSession = Depends(get_db)
) -> ConnectionRead:
    connection = Connection(**payload.model_dump())
    db.add(connection)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Connection name already exists",
        ) from exc
    await db.refresh(connection)
    return ConnectionRead.model_validate(connection)


@router.get("/{connection_id}", response_model=ConnectionRead)
async def get_connection(connection_id: int, db: AsyncSession = Depends(get_db)) -> ConnectionRead:
    connection = await db.get(Connection, connection_id)
    if connection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return ConnectionRead.model_validate(connection)


@router.put("/{connection_id}", response_model=ConnectionRead)
async def update_connection(
    connection_id: int, payload: ConnectionCreate, db: AsyncSession = Depends(get_db)
) -> ConnectionRead:
    connection = await db.get(Connection, connection_id)
    if connection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    for field, value in payload.model_dump().items():
        setattr(connection, field, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Connection name already exists",
        ) from exc
    await db.refresh(connection)
    return ConnectionRead.model_validate(connection)


@router.delete("/{connection_id}", status_code=status.HTTP_200_OK)
async def delete_connection(connection_id: int, db: AsyncSession = Depends(get_db)) -> None:
    connection = await db.get(Connection, connection_id)
    if connection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    await db.delete(connection)
    await db.commit()

