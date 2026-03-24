import { apiClient, extractApiError } from './client';
import type { Pipeline } from '../types/pipeline';

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
    nodes: (bp.pipeline_json?.nodes ?? []) as Pipeline['nodes'],
    edges: (bp.pipeline_json?.edges ?? []) as Pipeline['edges'],
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

export async function getPipelines(): Promise<Pipeline[]> {
  try {
    const response = await apiClient.get<BackendPipelineList>('/pipelines', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    const items = response.data?.items ?? (response.data as unknown as BackendPipeline[]);
    return Array.isArray(items) ? items.map(toFrontend) : [];
  } catch (error) {
    throw extractApiError(error, 'Failed to load pipelines.');
  }
}

export async function getPipeline(id: string): Promise<Pipeline> {
  try {
    const response = await apiClient.get<BackendPipeline>(`/pipelines/${id}`, {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    return toFrontend(response.data);
  } catch (error) {
    throw extractApiError(error, 'Failed to load pipeline.');
  }
}

export async function savePipeline(pipeline: Pipeline): Promise<Pipeline> {
  const isExisting = Boolean(pipeline.id);
  const payload = toBackendPayload(pipeline);

  try {
    const response = isExisting
      ? await apiClient.put<BackendPipeline>(`/pipelines/${pipeline.id}`, payload)
      : await apiClient.post<BackendPipeline>('/pipelines', payload);
    return toFrontend(response.data);
  } catch (error) {
    throw extractApiError(error, 'Failed to save pipeline.');
  }
}

export async function deletePipeline(id: string): Promise<void> {
  try {
    await apiClient.delete(`/pipelines/${id}`);
  } catch (error) {
    throw extractApiError(error, 'Failed to delete pipeline.');
  }
}
