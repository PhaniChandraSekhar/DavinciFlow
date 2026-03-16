import { apiClient } from './client';
import { getPipeline } from './pipelines';
import { topologicalSort } from '../utils/dagUtils';
import type { PipelineRun, RunLog } from '../types/execution';

const STORAGE_KEY = 'davinciflow:runs';

interface SocketLike {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  close: () => void;
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

class MockExecutionSocket extends EventTarget implements SocketLike {
  private timeouts: number[] = [];

  constructor(private readonly run: PipelineRun) {
    super();
    this.start();
  }

  private emitLog(log: RunLog) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'log', payload: log }) }));
  }

  private start() {
    this.run.steps.forEach((step, index) => {
      const runDelay = 400 + index * 900;
      const finishDelay = runDelay + 600;

      this.timeouts.push(
        window.setTimeout(() => {
          this.emitLog({
            id: crypto.randomUUID(),
            run_id: this.run.id,
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: `Starting ${step.step_name}`,
            step_id: step.node_id,
            step_status: 'running'
          });
        }, runDelay)
      );

      this.timeouts.push(
        window.setTimeout(() => {
          this.emitLog({
            id: crypto.randomUUID(),
            run_id: this.run.id,
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: `${step.step_name} completed`,
            step_id: step.node_id,
            step_status: 'success',
            records_in: 1000 - index * 80,
            records_out: 980 - index * 55,
            duration_ms: 500 + index * 180
          });
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
            duration_ms: 500 + index * 180
          }))
        };

        persistRun(completedRun);
        this.dispatchEvent(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'run.complete', payload: completedRun })
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
  try {
    const response = await apiClient.post<PipelineRun>(`/pipelines/${id}/run`);
    persistRun(response.data);
    return response.data;
  } catch {
    const pipeline = await getPipeline(id);
    const orderedNodeIds = topologicalSort(pipeline.nodes, pipeline.edges);
    const nodeIndex = new Map(pipeline.nodes.map((node) => [node.id, node]));
    const run: PipelineRun = {
      id: crypto.randomUUID(),
      pipeline_id: id,
      status: 'running',
      started_at: new Date().toISOString(),
      steps: orderedNodeIds.map((nodeId) => ({
        node_id: nodeId,
        step_name: nodeIndex.get(nodeId)?.data.label ?? nodeId,
        status: 'pending'
      }))
    };

    persistRun(run);
    return run;
  }
}

export async function getRun(id: string) {
  try {
    const response = await apiClient.get<PipelineRun>(`/runs/${id}`);
    return response.data;
  } catch {
    const run = readRuns().find((item) => item.id === id);

    if (!run) {
      throw new Error('Run not found');
    }

    return run;
  }
}

export function createLogsWebSocket(runId: string): SocketLike {
  const wsBase = import.meta.env.VITE_WS_URL;

  if (wsBase) {
    return new WebSocket(`${wsBase.replace(/\/$/, '')}/runs/${runId}/logs`);
  }

  const run = readRuns().find((item) => item.id === runId);

  if (!run) {
    throw new Error('Run not found');
  }

  return new MockExecutionSocket(run);
}
