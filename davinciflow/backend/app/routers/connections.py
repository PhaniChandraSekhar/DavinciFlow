from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.connection import Connection
from app.schemas.connection import (
    ConnectionCreate,
    ConnectionRead,
    merge_connection_config,
    redact_connection_config,
)

router = APIRouter(prefix="/api/connections", tags=["connections"])


def serialize_connection(connection: Connection) -> ConnectionRead:
    return ConnectionRead.model_validate(
        {
            "id": connection.id,
            "name": connection.name,
            "type": connection.type,
            "description": connection.description,
            "config": redact_connection_config(connection.config or {}),
            "created_at": connection.created_at,
            "updated_at": connection.updated_at,
        }
    )


@router.get("", response_model=list[ConnectionRead])
async def list_connections(db: AsyncSession = Depends(get_db)) -> list[ConnectionRead]:
    result = await db.execute(select(Connection).order_by(Connection.created_at.desc()))
    items = result.scalars().all()
    return [serialize_connection(item) for item in items]


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
    return serialize_connection(connection)


@router.get("/{connection_id}", response_model=ConnectionRead)
async def get_connection(connection_id: int, db: AsyncSession = Depends(get_db)) -> ConnectionRead:
    connection = await db.get(Connection, connection_id)
    if connection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return serialize_connection(connection)


@router.put("/{connection_id}", response_model=ConnectionRead)
async def update_connection(
    connection_id: int, payload: ConnectionCreate, db: AsyncSession = Depends(get_db)
) -> ConnectionRead:
    connection = await db.get(Connection, connection_id)
    if connection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    payload_data = payload.model_dump()
    payload_data["config"] = merge_connection_config(connection.config or {}, payload_data.get("config") or {})
    for field, value in payload_data.items():
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
    return serialize_connection(connection)


@router.delete("/{connection_id}", status_code=status.HTTP_200_OK)
async def delete_connection(connection_id: int, db: AsyncSession = Depends(get_db)) -> None:
    connection = await db.get(Connection, connection_id)
    if connection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    await db.delete(connection)
    await db.commit()

