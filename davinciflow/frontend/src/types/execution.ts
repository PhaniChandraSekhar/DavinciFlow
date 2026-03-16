export type RunStatus = 'idle' | 'pending' | 'running' | 'success' | 'failed';

export interface RunLog {
  id: string;
  run_id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  step_id?: string;
  step_status?: RunStatus;
  records_in?: number;
  records_out?: number;
  duration_ms?: number;
}

export interface PipelineRun {
  id: string;
  pipeline_id: string;
  status: RunStatus;
  started_at: string;
  finished_at?: string;
  steps: Array<{
    node_id: string;
    step_name: string;
    status: RunStatus;
    records_in?: number;
    records_out?: number;
    duration_ms?: number;
  }>;
}
