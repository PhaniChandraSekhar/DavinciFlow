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
