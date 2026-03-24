import { apiClient, extractApiError } from './client';
import { getPipeline } from './pipelines';
import { topologicalSort } from '../utils/dagUtils';
import type { Pipeline } from '../types/pipeline';
import type { PipelineRun } from '../types/execution';

interface SocketLike {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  close: () => void;
}

interface BackendRunLog {
  step_id: string;
  step_name: string;
  node_type: string;
  status: string;
  records_in: number;
  records_out: number;
  duration_ms: number;
  error?: string | null;
  started_at: string;
  finished_at?: string | null;
}

interface BackendRun {
  id: string | number;
  pipeline_id: string | number;
  status: string;
  parameters?: Record<string, unknown>;
  logs?: BackendRunLog[];
  error?: string | null;
  started_at: string;
  completed_at?: string | null;
}

function withApiPath(base: string, suffix: string): string {
  const normalizedBase = base.replace(/\/$/, '');
  return normalizedBase.endsWith('/api')
    ? `${normalizedBase}${suffix}`
    : `${normalizedBase}/api${suffix}`;
}

function normalizeRunStatus(status: string): PipelineRun['status'] {
  if (status === 'queued') return 'pending';
  if (status === 'completed') return 'success';
  if (status === 'success') return 'success';
  if (status === 'failed') return 'failed';
  if (status === 'running') return 'running';
  return 'idle';
}

function orderedSteps(pipeline: Pipeline) {
  const orderedNodeIds = topologicalSort(pipeline.nodes, pipeline.edges);
  const nodeIndex = new Map(pipeline.nodes.map((node) => [node.id, node]));
  return orderedNodeIds.map((nodeId) => ({
    node_id: nodeId,
    step_name: nodeIndex.get(nodeId)?.data.label ?? nodeId,
    status: 'pending' as const,
  }));
}

function toFrontendRun(run: BackendRun, pipeline: Pipeline): PipelineRun {
  const stepState = new Map<string, PipelineRun['steps'][number]>();

  for (const step of orderedSteps(pipeline)) {
    stepState.set(step.node_id, step);
  }

  for (const log of run.logs ?? []) {
    stepState.set(log.step_id, {
      node_id: log.step_id,
      step_name: log.step_name,
      status: normalizeRunStatus(log.status),
      records_in: log.records_in,
      records_out: log.records_out,
      duration_ms: log.duration_ms,
    });
  }

  return {
    id: String(run.id),
    pipeline_id: String(run.pipeline_id),
    status: normalizeRunStatus(run.status),
    started_at: run.started_at,
    finished_at: run.completed_at ?? undefined,
    steps: Array.from(stepState.values()),
  };
}

export async function runPipeline(id: string) {
  const pipeline = await getPipeline(id);
  try {
    const response = await apiClient.post<BackendRun>(`/pipelines/${id}/run`, { parameters: {} });
    return toFrontendRun(response.data, pipeline);
  } catch (error) {
    throw extractApiError(error, 'Failed to start pipeline run.');
  }
}

export async function getRun(id: string) {
  try {
    const response = await apiClient.get<BackendRun>(`/runs/${id}`);
    const pipeline = await getPipeline(String(response.data.pipeline_id));
    return toFrontendRun(response.data, pipeline);
  } catch (error) {
    throw extractApiError(error, 'Failed to load pipeline run.');
  }
}

export function createLogsWebSocket(runId: string): SocketLike {
  const explicitWsBase = import.meta.env.VITE_WS_URL as string | undefined;
  const explicitApiBase = import.meta.env.VITE_API_URL as string | undefined;

  if (explicitWsBase) {
    return new WebSocket(withApiPath(explicitWsBase, `/runs/${runId}/logs/ws`));
  }

  if (explicitApiBase) {
    const url = new URL(explicitApiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = withApiPath(url.pathname || '', `/runs/${runId}/logs/ws`);
    return new WebSocket(url.toString());
  }

  if (typeof window === 'undefined') {
    throw new Error('WebSocket connections are only supported in the browser.');
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${protocol}//${window.location.host}/api/runs/${runId}/logs/ws`);
}
