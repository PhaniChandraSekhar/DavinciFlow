import { apiClient, extractApiError } from './client';

export interface AuthSession {
  auth_enabled: boolean;
  authenticated: boolean;
  username: string | null;
}

export async function getAuthSession() {
  try {
    const response = await apiClient.get<AuthSession>('/auth/session');
    return response.data;
  } catch (error) {
    throw extractApiError(error, 'Failed to load authentication state.');
  }
}

export async function login(username: string, password: string) {
  try {
    const response = await apiClient.post<AuthSession>('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    throw extractApiError(error, 'Failed to sign in.');
  }
}

export async function logout() {
  try {
    const response = await apiClient.delete<AuthSession>('/auth/session');
    return response.data;
  } catch (error) {
    throw extractApiError(error, 'Failed to sign out.');
  }
}
