export type ConnectionType = 'postgres' | 'mysql' | 'snowflake' | 's3' | 'api';
export type ConnectionConfigValue = string | number | boolean | null;

export interface Connection {
  id?: string;
  name: string;
  type: ConnectionType;
  description?: string | null;
  config: Record<string, ConnectionConfigValue>;
  created_at: string;
  updated_at: string;
}
