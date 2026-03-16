from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from datetime import UTC, datetime
from typing import Any

import pandas as pd
import structlog

from app.database import AsyncSessionLocal
from app.models.pipeline import PipelineRun
from app.services.step_registry import get_step_class


class ExecutionBroker:
    def __init__(self) -> None:
        self._queues: dict[int, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, run_id: int) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        async with self._lock:
            self._queues[run_id].add(queue)
        return queue

    async def unsubscribe(self, run_id: int, queue: asyncio.Queue[dict[str, Any]]) -> None:
        async with self._lock:
            subscribers = self._queues.get(run_id)
            if not subscribers:
                return
            subscribers.discard(queue)
            if not subscribers:
                self._queues.pop(run_id, None)

    async def publish(self, run_id: int, event: dict[str, Any]) -> None:
        async with self._lock:
            subscribers = list(self._queues.get(run_id, set()))
        for queue in subscribers:
            await queue.put(event)


class ExecutionEngine:
    def __init__(self) -> None:
        self._session_factory = AsyncSessionLocal
        self._logger = structlog.get_logger("execution_engine")

    @property
    def session_factory(self):
        return self._session_factory

    async def start_run(
        self,
        pipeline_id: int,
        pipeline_json: dict[str, Any],
        parameters: dict[str, Any] | None = None,
    ) -> PipelineRun:
        parameters = parameters or {}
        async with self._session_factory() as session:
            run = PipelineRun(
                pipeline_id=pipeline_id,
                status="queued",
                parameters=parameters,
                logs=[],
            )
            session.add(run)
            await session.commit()
            await session.refresh(run)

        asyncio.create_task(
            self.execute_run(
                run_id=run.id,
                pipeline_id=pipeline_id,
                pipeline_json=pipeline_json,
                parameters=parameters,
            )
        )
        return run

    async def execute_run(
        self,
        run_id: int,
        pipeline_id: int,
        pipeline_json: dict[str, Any],
        parameters: dict[str, Any],
    ) -> None:
        async with self._session_factory() as session:
            run = await session.get(PipelineRun, run_id)
            if run is None:
                return
            run.status = "running"
            run.error = None
            run.logs = []
            await session.commit()

        try:
            nodes = pipeline_json.get("nodes", [])
            edges = pipeline_json.get("edges", [])
            ordered_nodes, incoming = self._topological_sort(nodes, edges)
        except Exception as exc:
            await self._fail_run(run_id, f"Invalid pipeline graph: {exc}")
            return

        outputs: dict[str, pd.DataFrame] = {}
        all_logs: list[dict[str, Any]] = []

        for node in ordered_nodes:
            node_id = str(node["id"])
            node_type = node["type"]
            step_class = get_step_class(node_type)
            if step_class is None:
                await self._handle_step_failure(
                    run_id=run_id,
                    all_logs=all_logs,
                    node=node,
                    records_in=0,
                    started_at=datetime.now(UTC),
                    exc=ValueError(f"Unknown step type '{node_type}'"),
                )
                return

            input_df = self._merge_inputs(outputs, incoming[node_id])
            records_in = 0 if input_df is None else int(len(input_df))
            step = step_class(
                config=self._extract_node_config(node),
                context={
                    "session_factory": self._session_factory,
                    "parameters": parameters,
                    "pipeline_id": pipeline_id,
                    "run_id": run_id,
                    "node": node,
                },
            )
            started_at = datetime.now(UTC)
            start_ns = time.perf_counter_ns()

            try:
                output_df = await step.execute(input_df)
                output_df = output_df if output_df is not None else pd.DataFrame()
                outputs[node_id] = output_df
                finished_at = datetime.now(UTC)
                log_entry = self._build_log(
                    node=node,
                    status="success",
                    records_in=records_in,
                    records_out=int(len(output_df)),
                    duration_ms=int((time.perf_counter_ns() - start_ns) / 1_000_000),
                    started_at=started_at,
                    finished_at=finished_at,
                    error=None,
                )
                all_logs.append(log_entry)
                await self._persist_progress(run_id, all_logs, status="running")
                await execution_broker.publish(run_id, {"event": "log", "data": log_entry})
            except Exception as exc:
                await self._handle_step_failure(
                    run_id=run_id,
                    all_logs=all_logs,
                    node=node,
                    records_in=records_in,
                    started_at=started_at,
                    exc=exc,
                    duration_ms=int((time.perf_counter_ns() - start_ns) / 1_000_000),
                )
                return

        async with self._session_factory() as session:
            run = await session.get(PipelineRun, run_id)
            if run is None:
                return
            run.status = "completed"
            run.logs = all_logs
            run.completed_at = datetime.now(UTC)
            await session.commit()

        await execution_broker.publish(run_id, {"event": "status", "status": "completed", "run_id": run_id})
        self._logger.info("pipeline_run_completed", run_id=run_id, pipeline_id=pipeline_id)

    def _topological_sort(
        self, nodes: list[dict[str, Any]], edges: list[dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], dict[str, list[str]]]:
        node_map = {str(node["id"]): node for node in nodes}
        adjacency: dict[str, list[str]] = {node_id: [] for node_id in node_map}
        incoming: dict[str, list[str]] = {node_id: [] for node_id in node_map}
        indegree: dict[str, int] = {node_id: 0 for node_id in node_map}

        for edge in edges:
            source = str(edge.get("source"))
            target = str(edge.get("target"))
            if source not in node_map or target not in node_map:
                raise ValueError("Edge references unknown node")
            adjacency[source].append(target)
            incoming[target].append(source)
            indegree[target] += 1

        queue = deque(node_id for node_id, degree in indegree.items() if degree == 0)
        ordered_ids: list[str] = []

        while queue:
            node_id = queue.popleft()
            ordered_ids.append(node_id)
            for target in adjacency[node_id]:
                indegree[target] -= 1
                if indegree[target] == 0:
                    queue.append(target)

        if len(ordered_ids) != len(node_map):
            raise ValueError("Cycle detected in pipeline graph")

        return [node_map[node_id] for node_id in ordered_ids], incoming

    def _merge_inputs(
        self, outputs: dict[str, pd.DataFrame], predecessors: list[str]
    ) -> pd.DataFrame | None:
        if not predecessors:
            return None
        frames = [outputs[node_id] for node_id in predecessors if node_id in outputs]
        if not frames:
            return None
        if len(frames) == 1:
            return frames[0].copy()
        return pd.concat(frames, ignore_index=True)

    def _extract_node_config(self, node: dict[str, Any]) -> dict[str, Any]:
        if isinstance(node.get("config"), dict):
            return node["config"]
        data = node.get("data")
        if isinstance(data, dict) and isinstance(data.get("config"), dict):
            return data["config"]
        return {}

    def _build_log(
        self,
        node: dict[str, Any],
        status: str,
        records_in: int,
        records_out: int,
        duration_ms: int,
        started_at: datetime,
        finished_at: datetime,
        error: str | None,
    ) -> dict[str, Any]:
        return {
            "step_id": str(node["id"]),
            "step_name": self._node_name(node),
            "node_type": node["type"],
            "status": status,
            "records_in": records_in,
            "records_out": records_out,
            "duration_ms": duration_ms,
            "error": error,
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
        }

    def _node_name(self, node: dict[str, Any]) -> str:
        data = node.get("data")
        if isinstance(data, dict):
            return str(data.get("label") or data.get("name") or node.get("name") or node["type"])
        return str(node.get("name") or node["type"])

    async def _persist_progress(
        self, run_id: int, logs: list[dict[str, Any]], status: str, error: str | None = None
    ) -> None:
        async with self._session_factory() as session:
            run = await session.get(PipelineRun, run_id)
            if run is None:
                return
            run.status = status
            run.logs = logs
            run.error = error
            await session.commit()

    async def _fail_run(self, run_id: int, error: str) -> None:
        async with self._session_factory() as session:
            run = await session.get(PipelineRun, run_id)
            if run is None:
                return
            run.status = "failed"
            run.error = error
            run.completed_at = datetime.now(UTC)
            await session.commit()
        await execution_broker.publish(run_id, {"event": "status", "status": "failed", "run_id": run_id, "error": error})

    async def _handle_step_failure(
        self,
        run_id: int,
        all_logs: list[dict[str, Any]],
        node: dict[str, Any],
        records_in: int,
        started_at: datetime,
        exc: Exception,
        duration_ms: int = 0,
    ) -> None:
        error_message = str(exc)
        failed_at = datetime.now(UTC)
        log_entry = self._build_log(
            node=node,
            status="failed",
            records_in=records_in,
            records_out=0,
            duration_ms=duration_ms,
            started_at=started_at,
            finished_at=failed_at,
            error=error_message,
        )
        all_logs.append(log_entry)
        async with self._session_factory() as session:
            run = await session.get(PipelineRun, run_id)
            if run is None:
                return
            run.status = "failed"
            run.logs = all_logs
            run.error = error_message
            run.completed_at = failed_at
            await session.commit()
        await execution_broker.publish(run_id, {"event": "log", "data": log_entry})
        await execution_broker.publish(run_id, {"event": "status", "status": "failed", "run_id": run_id, "error": error_message})
        self._logger.exception("pipeline_run_failed", run_id=run_id, step_id=node["id"], error=error_message)


execution_broker = ExecutionBroker()
execution_engine = ExecutionEngine()
