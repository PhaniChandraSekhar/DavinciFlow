import { create } from 'zustand';
import type { PipelineRun, RunLog } from '../types/execution';

interface ExecutionStore {
  currentRun: PipelineRun | null;
  logs: RunLog[];
  isRunning: boolean;
  startRun: (run: PipelineRun) => void;
  appendLog: (log: RunLog) => void;
  completeRun: (run: PipelineRun) => void;
  failRun: (run: PipelineRun) => void;
  clearRun: () => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  currentRun: null,
  logs: [],
  isRunning: false,
  startRun: (run) =>
    set({
      currentRun: run,
      logs: [],
      isRunning: true
    }),
  appendLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log],
      currentRun: state.currentRun
        ? {
            ...state.currentRun,
            steps: state.currentRun.steps.map((step) =>
              step.node_id === log.step_id
                ? {
                    ...step,
                    status: log.step_status ?? step.status,
                    records_in: log.records_in ?? step.records_in,
                    records_out: log.records_out ?? step.records_out,
                    duration_ms: log.duration_ms ?? step.duration_ms
                  }
                : step
            )
          }
        : null
    })),
  completeRun: (run) =>
    set({
      currentRun: run,
      isRunning: false
    }),
  failRun: (run) =>
    set({
      currentRun: run,
      isRunning: false
    }),
  clearRun: () =>
    set({
      currentRun: null,
      logs: [],
      isRunning: false
    })
}));
