import { apiClient } from './client';
import type { Pipeline } from '../types/pipeline';

const STORAGE_KEY = 'davinciflow:pipelines';

// ── Backend DTO shapes ───────────────────────────────────────────────────────

interface BackendPipeline {
  id: string | number;
  name: string;
  description?: string | null;
  pipeline_json: { nodes?: unknown[]; edges?: unknown[] };
  created_at?: string;
  updated_at?: string;
  latest_run_status?: string | null;
  latest_run_at?: string | null;
}

interface BackendPipelineList {
  items: BackendPipeline[];
  total: number;
}

// ── Shape converters ─────────────────────────────────────────────────────────

function toFrontend(bp: BackendPipeline): Pipeline {
  const normalizedStatus =
    bp.latest_run_status === 'queued'
      ? 'running'
      : bp.latest_run_status === 'completed'
        ? 'success'
        : bp.latest_run_status === 'failed'
          ? 'failed'
          : bp.latest_run_status === 'running'
            ? 'running'
            : undefined;

  return {
    id: String(bp.id),
    name: bp.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodes: (bp.pipeline_json?.nodes ?? []) as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    edges: (bp.pipeline_json?.edges ?? []) as any[],
    updated_at: bp.updated_at,
    latest_run_status: normalizedStatus,
    latest_run_at: bp.latest_run_at ?? undefined,
  };
}

function toBackendPayload(pipeline: Pipeline) {
  return {
    name: pipeline.name,
    description: null,
    pipeline_json: {
      nodes: pipeline.nodes ?? [],
      edges: pipeline.edges ?? [],
    },
  };
}

// ── localStorage fallback ────────────────────────────────────────────────────

function readPipelines(): Pipeline[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Pipeline[]) : [];
}

function writePipelines(pipelines: Pipeline[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getPipelines(): Promise<Pipeline[]> {
  try {
    const response = await apiClient.get<BackendPipelineList>('/pipelines', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    const items = response.data?.items ?? (response.data as unknown as BackendPipeline[]);
    return Array.isArray(items) ? items.map(toFrontend) : [];
  } catch {
    return readPipelines().sort((a, b) =>
      (b.updated_at ?? '').localeCompare(a.updated_at ?? ''),
    );
  }
}

export async function getPipeline(id: string): Promise<Pipeline> {
  try {
    const response = await apiClient.get<BackendPipeline>(`/pipelines/${id}`, {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    return toFrontend(response.data);
  } catch {
    const pipeline = readPipelines().find((item) => item.id === id);
    if (!pipeline) throw new Error('Pipeline not found');
    return pipeline;
  }
}

export async function savePipeline(pipeline: Pipeline): Promise<Pipeline> {
  const isExisting = Boolean(pipeline.id);
  const localId = pipeline.id ?? crypto.randomUUID();
  const backendPayload = toBackendPayload(pipeline);

  try {
    const response = isExisting
      ? await apiClient.put<BackendPipeline>(`/pipelines/${pipeline.id}`, backendPayload)
      : await apiClient.post<BackendPipeline>('/pipelines', backendPayload);

    return toFrontend(response.data);
  } catch {
    // Fallback to localStorage
    const localPipeline: Pipeline = {
      ...pipeline,
      id: localId,
      updated_at: new Date().toISOString(),
    };
    const pipelines = readPipelines();
    const next = pipelines.some((item) => item.id === localId)
      ? pipelines.map((item) => (item.id === localId ? localPipeline : item))
      : [localPipeline, ...pipelines];
    writePipelines(next);
    return localPipeline;
  }
}

export async function deletePipeline(id: string): Promise<void> {
  try {
    await apiClient.delete(`/pipelines/${id}`);
  } catch {
    writePipelines(readPipelines().filter((pipeline) => pipeline.id !== id));
  }
}
