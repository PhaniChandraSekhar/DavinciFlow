export type ConnectionType = 'postgres' | 'mysql' | 'snowflake' | 's3' | 'api';

export interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  config: Record<string, string>;
  created_at: string;
  updated_at: string;
}
