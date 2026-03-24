import { apiClient, extractApiError } from './client';
import type { Connection, ConnectionConfigValue } from '../types/connection';

interface BackendConnection {
  id: string | number;
  name: string;
  type: Connection['type'];
  description?: string | null;
  config: Record<string, ConnectionConfigValue>;
  created_at: string;
  updated_at: string;
}

function toFrontendConnection(connection: BackendConnection): Connection {
  return {
    id: String(connection.id),
    name: connection.name,
    type: connection.type,
    description: connection.description ?? null,
    config: connection.config ?? {},
    created_at: connection.created_at,
    updated_at: connection.updated_at,
  };
}

export async function getConnections() {
  try {
    const response = await apiClient.get<BackendConnection[]>('/connections');
    return response.data.map(toFrontendConnection);
  } catch (error) {
    throw extractApiError(error, 'Failed to load connections.');
  }
}

export async function saveConnection(connection: Omit<Connection, 'created_at' | 'updated_at'>) {
  const payload = {
    name: connection.name,
    type: connection.type,
    description: connection.description ?? null,
    config: connection.config,
  };

  try {
    const response = connection.id
      ? await apiClient.put<BackendConnection>(`/connections/${connection.id}`, payload)
      : await apiClient.post<BackendConnection>('/connections', payload);
    return toFrontendConnection(response.data);
  } catch (error) {
    throw extractApiError(error, 'Failed to save connection.');
  }
}

export async function deleteConnection(id: string) {
  try {
    await apiClient.delete(`/connections/${id}`);
  } catch (error) {
    throw extractApiError(error, 'Failed to delete connection.');
  }
}
