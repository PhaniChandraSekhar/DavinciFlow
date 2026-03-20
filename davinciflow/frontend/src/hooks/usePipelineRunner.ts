import { useEffect, useRef } from 'react';
import { createLogsWebSocket, runPipeline } from '../api/execution';
import { useExecutionStore } from '../store/executionStore';
import { usePipelineStore } from '../store/pipelineStore';
import type { PipelineRun, RunLog } from '../types/execution';

interface RunnerEvent<T> {
  type: 'log' | 'run.complete' | 'run.failed';
  payload: T;
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
      message: 'Pipeline run queued.'
    });

    const socket = createLogsWebSocket(run.id);
    socketRef.current = socket;

    const onMessage = (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      const parsed = JSON.parse(messageEvent.data) as
        | RunnerEvent<RunLog>
        | RunnerEvent<PipelineRun>;

      if (parsed.type === 'log') {
        appendLog(parsed.payload as RunLog);
      }

      if (parsed.type === 'run.complete') {
        completeRun(parsed.payload as PipelineRun);
        usePipelineStore.getState().setRunStatus(pipelineId, 'success');
        socket.close();
      }

      if (parsed.type === 'run.failed') {
        failRun(parsed.payload as PipelineRun);
        usePipelineStore.getState().setRunStatus(pipelineId, 'failed');
        socket.close();
      }
    };

    socket.addEventListener('message', onMessage);
  }

  return {
    runPipeline: handleRun
  };
}
