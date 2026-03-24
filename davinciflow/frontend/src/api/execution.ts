import { apiClient } from './client';
import { getPipeline } from './pipelines';
import { topologicalSort } from '../utils/dagUtils';
import type { Pipeline } from '../types/pipeline';
import type { PipelineRun } from '../types/execution';

const STORAGE_KEY = 'davinciflow:runs';

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

function readRuns() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as PipelineRun[]) : [];
}

function writeRuns(runs: PipelineRun[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

function persistRun(run: PipelineRun) {
  const runs = readRuns();
  const next = runs.some((item) => item.id === run.id)
    ? runs.map((item) => (item.id === run.id ? run : item))
    : [run, ...runs];

  writeRuns(next);
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

class MockExecutionSocket extends EventTarget implements SocketLike {
  private timeouts: number[] = [];

  constructor(private readonly run: PipelineRun) {
    super();
    this.start();
  }

  private start() {
    this.run.steps.forEach((step, index) => {
      const runDelay = 400 + index * 900;
      const finishDelay = runDelay + 600;

      this.timeouts.push(
        window.setTimeout(() => {
          this.dispatchEvent(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'log',
                payload: {
                  id: `${this.run.id}:${step.node_id}:start`,
                  run_id: this.run.id,
                  timestamp: new Date().toISOString(),
                  level: 'INFO',
                  message: `Starting ${step.step_name}`,
                  step_id: step.node_id,
                  step_status: 'running',
                },
              }),
            })
          );
        }, runDelay)
      );

      this.timeouts.push(
        window.setTimeout(() => {
          this.dispatchEvent(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'log',
                payload: {
                  id: `${this.run.id}:${step.node_id}:finish`,
                  run_id: this.run.id,
                  timestamp: new Date().toISOString(),
                  level: 'INFO',
                  message: `${step.step_name} completed`,
                  step_id: step.node_id,
                  step_status: 'success',
                  records_in: 1000 - index * 80,
                  records_out: 980 - index * 55,
                  duration_ms: 500 + index * 180,
                },
              }),
            })
          );
        }, finishDelay)
      );
    });

    const finalDelay = 1200 + this.run.steps.length * 900;
    this.timeouts.push(
      window.setTimeout(() => {
        const completedRun: PipelineRun = {
          ...this.run,
          status: 'success',
          finished_at: new Date().toISOString(),
          steps: this.run.steps.map((step, index) => ({
            ...step,
            status: 'success',
            records_in: 1000 - index * 80,
            records_out: 980 - index * 55,
            duration_ms: 500 + index * 180,
          })),
        };

        persistRun(completedRun);
        this.dispatchEvent(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'run.complete', payload: completedRun }),
          })
        );
      }, finalDelay)
    );
  }

  close() {
    this.timeouts.forEach((timeout) => window.clearTimeout(timeout));
    this.dispatchEvent(new CloseEvent('close'));
  }
}

export async function runPipeline(id: string) {
  const pipeline = await getPipeline(id);
  try {
    const response = await apiClient.post<BackendRun>(`/pipelines/${id}/run`, { parameters: {} });
    const run = toFrontendRun(response.data, pipeline);
    persistRun(run);
    return run;
  } catch {
    const run: PipelineRun = {
      id: crypto.randomUUID(),
      pipeline_id: id,
      status: 'running',
      started_at: new Date().toISOString(),
      steps: orderedSteps(pipeline),
    };

    persistRun(run);
    return run;
  }
}

export async function getRun(id: string) {
  try {
    const response = await apiClient.get<BackendRun>(`/runs/${id}`);
    const pipeline = await getPipeline(String(response.data.pipeline_id));
    return toFrontendRun(response.data, pipeline);
  } catch {
    const run = readRuns().find((item) => item.id === id);

    if (!run) {
      throw new Error('Run not found');
    }

    return run;
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

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return new WebSocket(`${protocol}//${window.location.host}/api/runs/${runId}/logs/ws`);
  }

  const run = readRuns().find((item) => item.id === runId);

  if (!run) {
    throw new Error('Run not found');
  }

  return new MockExecutionSocket(run);
}
