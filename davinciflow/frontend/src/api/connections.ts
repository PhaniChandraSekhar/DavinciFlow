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

export async function getConnections() {
  try {
    const response = await apiClient.get<Connection[]>('/connections');
    return response.data;
  } catch {
    return readConnections().sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function saveConnection(connection: Omit<Connection, 'created_at' | 'updated_at'>) {
  const existing = readConnections().find((item) => item.id === connection.id);
  const payload: Connection = {
    ...connection,
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const response = await apiClient.put<Connection>(`/connections/${payload.id}`, payload);
    return response.data;
  } catch {
    const connections = readConnections();
    const next = connections.some((item) => item.id === payload.id)
      ? connections.map((item) => (item.id === payload.id ? payload : item))
      : [...connections, payload];

    writeConnections(next);
    return payload;
  }
}

export async function deleteConnection(id: string) {
  try {
    await apiClient.delete(`/connections/${id}`);
  } catch {
    writeConnections(readConnections().filter((connection) => connection.id !== id));
  }
}
