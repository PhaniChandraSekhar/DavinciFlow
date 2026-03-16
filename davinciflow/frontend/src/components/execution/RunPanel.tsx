import { useExecutionStore } from '../../store/executionStore';
import { cn } from '../../utils/cn';
import LogViewer from './LogViewer';

const statusBadge: Record<string, string> = {
  idle: 'bg-slate-700 text-slate-300',
  pending: 'bg-amber-500/20 text-amber-300',
  running: 'bg-sky-500/20 text-sky-300 animate-pulse',
  success: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-rose-500/20 text-rose-300',
};

export default function RunPanel() {
  const currentRun = useExecutionStore((s) => s.currentRun);
  const logs = useExecutionStore((s) => s.logs);
  const isRunning = useExecutionStore((s) => s.isRunning);
  const clearRun = useExecutionStore((s) => s.clearRun);

  if (!currentRun && !isRunning) return null;

  return (
    <div className="border-t border-slate-700/80 bg-slate-900/95 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">
          Pipeline Run
          {currentRun && (
            <span
              className={cn(
                'ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                statusBadge[currentRun.status]
              )}
            >
              {currentRun.status}
            </span>
          )}
        </h3>
        {!isRunning && (
          <button
            onClick={clearRun}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {currentRun && currentRun.steps.length > 0 && (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/60 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Step</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium text-right">In</th>
                <th className="pb-2 pr-4 font-medium text-right">Out</th>
                <th className="pb-2 font-medium text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {currentRun.steps.map((step) => (
                <tr key={step.node_id} className="border-b border-slate-800/60">
                  <td className="py-2 pr-4 text-slate-300">{step.step_name}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                        statusBadge[step.status]
                      )}
                    >
                      {step.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-400">
                    {step.records_in ?? '-'}
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-400">
                    {step.records_out ?? '-'}
                  </td>
                  <td className="py-2 text-right text-slate-400">
                    {step.duration_ms != null ? `${step.duration_ms}ms` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LogViewer logs={logs} />
    </div>
  );
}
