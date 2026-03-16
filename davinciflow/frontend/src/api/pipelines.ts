import { apiClient } from './client';
import type { Pipeline } from '../types/pipeline';

const STORAGE_KEY = 'davinciflow:pipelines';

function readPipelines() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Pipeline[]) : [];
}

function writePipelines(pipelines: Pipeline[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
}

export async function getPipelines() {
  try {
    const response = await apiClient.get<Pipeline[]>('/pipelines');
    return response.data;
  } catch {
    return readPipelines().sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
  }
}

export async function getPipeline(id: string) {
  try {
    const response = await apiClient.get<Pipeline>(`/pipelines/${id}`);
    return response.data;
  } catch {
    const pipeline = readPipelines().find((item) => item.id === id);

    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    return pipeline;
  }
}

export async function savePipeline(pipeline: Pipeline) {
  const isExistingPipeline = Boolean(pipeline.id);
  const payload = {
    ...pipeline,
    id: pipeline.id ?? crypto.randomUUID(),
    updated_at: new Date().toISOString()
  };

  try {
    const response = isExistingPipeline
      ? await apiClient.put<Pipeline>(`/pipelines/${payload.id}`, payload)
      : await apiClient.post<Pipeline>('/pipelines', payload);

    return response.data;
  } catch {
    const pipelines = readPipelines();
    const next = pipelines.some((item) => item.id === payload.id)
      ? pipelines.map((item) => (item.id === payload.id ? payload : item))
      : [payload, ...pipelines];

    writePipelines(next);
    return payload;
  }
}

export async function deletePipeline(id: string) {
  try {
    await apiClient.delete(`/pipelines/${id}`);
  } catch {
    writePipelines(readPipelines().filter((pipeline) => pipeline.id !== id));
  }
}
