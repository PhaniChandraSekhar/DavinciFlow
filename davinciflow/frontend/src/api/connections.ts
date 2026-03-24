import { apiClient } from './client';
import type { Connection } from '../types/connection';

const STORAGE_KEY = 'davinciflow:connections';

function readConnections() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Connection[]) : [];
}

function writeConnections(connections: Connection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

interface BackendConnection {
  id: string | number;
  name: string;
  type: Connection['type'];
  description?: string | null;
  config: Record<string, string | number>;
  created_at: string;
  updated_at: string;
}

function toFrontendConnection(connection: BackendConnection): Connection {
  return {
    id: String(connection.id),
    name: connection.name,
    type: connection.type,
    config: connection.config ?? {},
    created_at: connection.created_at,
    updated_at: connection.updated_at,
  };
}

export async function getConnections() {
  try {
    const response = await apiClient.get<BackendConnection[]>('/connections');
    return response.data.map(toFrontendConnection);
  } catch {
    return readConnections().sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function saveConnection(connection: Omit<Connection, 'created_at' | 'updated_at'>) {
  const existing = connection.id ? readConnections().find((item) => item.id === connection.id) : undefined;
  const payload: Connection = {
    ...connection,
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const backendPayload = {
    name: payload.name,
    type: payload.type,
    description: null,
    config: payload.config,
  };

  try {
    const response = payload.id
      ? await apiClient.put<BackendConnection>(`/connections/${payload.id}`, backendPayload)
      : await apiClient.post<BackendConnection>('/connections', backendPayload);
    return toFrontendConnection(response.data);
  } catch {
    const connections = readConnections();
    const localId = payload.id ?? crypto.randomUUID();
    const localPayload = { ...payload, id: localId };
    const next = connections.some((item) => item.id === localId)
      ? connections.map((item) => (item.id === localId ? localPayload : item))
      : [...connections, localPayload];

    writeConnections(next);
    return localPayload;
  }
}

export async function deleteConnection(id: string) {
  try {
    await apiClient.delete(`/connections/${id}`);
  } catch {
    writeConnections(readConnections().filter((connection) => connection.id !== id));
  }
}
