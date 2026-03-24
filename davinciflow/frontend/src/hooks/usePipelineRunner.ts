import { useEffect, useRef } from 'react';
import { createLogsWebSocket, getRun, runPipeline } from '../api/execution';
import { useExecutionStore } from '../store/executionStore';
import { usePipelineStore } from '../store/pipelineStore';
import type { PipelineRun, RunLog } from '../types/execution';

interface RunnerEvent<T> {
  type: 'log' | 'run.complete' | 'run.failed';
  payload: T;
}

interface BackendLogEvent {
  event: 'log';
  data: {
    step_id: string;
    step_name: string;
    status: string;
    records_in: number;
    records_out: number;
    duration_ms: number;
    error?: string | null;
    started_at: string;
    finished_at?: string | null;
  };
}

interface BackendStatusEvent {
  event: 'status';
  status: 'running' | 'completed' | 'failed';
  run_id: number | string;
  error?: string;
}

export function usePipelineRunner() {
  const { startRun, appendLog, completeRun, failRun } = useExecutionStore();
  const socketRef = useRef<ReturnType<typeof createLogsWebSocket> | null>(null);

  useEffect(
    () => () => {
      socketRef.current?.close();
      socketRef.current = null;
    },
    []
  );

  async function handleRun(pipelineIdOverride?: string) {
    const pipelineId = pipelineIdOverride ?? usePipelineStore.getState().pipelineId;

    if (!pipelineId) {
      return;
    }

    socketRef.current?.close();
    usePipelineStore.getState().setRunStatus(pipelineId, 'running');
    const run = await runPipeline(pipelineId);
    startRun(run);
    appendLog({
      id: crypto.randomUUID(),
      run_id: run.id,
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Pipeline run queued.',
    });

    const socket = createLogsWebSocket(run.id);
    socketRef.current = socket;

    const onMessage = (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      const parsed = JSON.parse(messageEvent.data) as
        | RunnerEvent<RunLog>
        | RunnerEvent<PipelineRun>
        | BackendLogEvent
        | BackendStatusEvent;

      if ('type' in parsed && parsed.type === 'log') {
        appendLog(parsed.payload as RunLog);
        return;
      }

      if ('type' in parsed && parsed.type === 'run.complete') {
        completeRun(parsed.payload as PipelineRun);
        usePipelineStore.getState().setRunStatus(pipelineId, 'success');
        socket.close();
        return;
      }

      if ('type' in parsed && parsed.type === 'run.failed') {
        failRun(parsed.payload as PipelineRun);
        usePipelineStore.getState().setRunStatus(pipelineId, 'failed');
        socket.close();
        return;
      }

      if ('event' in parsed && parsed.event === 'log') {
        appendLog({
          id: `${run.id}:${parsed.data.step_id}:${parsed.data.finished_at ?? parsed.data.started_at}`,
          run_id: run.id,
          timestamp: parsed.data.finished_at ?? parsed.data.started_at,
          level: parsed.data.error ? 'ERROR' : 'INFO',
          message: parsed.data.error
            ? `${parsed.data.step_name} failed: ${parsed.data.error}`
            : `${parsed.data.step_name} ${parsed.data.status}`,
          step_id: parsed.data.step_id,
          step_status:
            parsed.data.status === 'completed'
              ? 'success'
              : parsed.data.status === 'failed'
                ? 'failed'
                : parsed.data.status === 'queued'
                  ? 'pending'
                  : 'running',
          records_in: parsed.data.records_in,
          records_out: parsed.data.records_out,
          duration_ms: parsed.data.duration_ms,
        });
        return;
      }

      if ('event' in parsed && parsed.event === 'status' && parsed.status !== 'running') {
        void (async () => {
          const finalRun = await getRun(String(parsed.run_id));
          if (parsed.status === 'completed') {
            completeRun(finalRun);
            usePipelineStore.getState().setRunStatus(pipelineId, 'success');
          } else {
            failRun(finalRun);
            usePipelineStore.getState().setRunStatus(pipelineId, 'failed');
          }
          socket.close();
        })();
      }
    };

    socket.addEventListener('message', onMessage);
  }

  return {
    runPipeline: handleRun,
  };
}
