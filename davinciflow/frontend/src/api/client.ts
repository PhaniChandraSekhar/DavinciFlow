import axios from 'axios';

const configuredBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const baseURL = configuredBase
  ? configuredBase.endsWith('/api')
    ? configuredBase
    : `${configuredBase.replace(/\/$/, '')}/api`
  : '/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers['X-Requested-With'] = 'DavinciFlow';
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export function extractApiError(error: unknown, fallbackMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data;

    if (typeof detail === 'string' && detail.trim()) {
      return new Error(detail);
    }

    if (detail && typeof detail === 'object') {
      const detailMessage =
        'detail' in detail && typeof detail.detail === 'string'
          ? detail.detail
          : 'message' in detail && typeof detail.message === 'string'
            ? detail.message
            : null;

      if (detailMessage) {
        return new Error(detailMessage);
      }
    }

    if (error.message) {
      return new Error(error.message);
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}
