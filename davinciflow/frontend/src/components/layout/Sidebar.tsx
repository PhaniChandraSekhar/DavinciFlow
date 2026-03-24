import { FolderPlus, Link2, Workflow } from 'lucide-react';
import type { Pipeline } from '../../types/pipeline';
import { cn } from '../../utils/cn';
import { navigateTo } from '../../utils/navigation';
import { usePipelineStore } from '../../store/pipelineStore';

function RunStatusDot({
  pipelineId,
  initialStatus,
}: {
  pipelineId: string;
  initialStatus?: 'pending' | 'running' | 'success' | 'failed';
}) {
  const status = usePipelineStore((s) => s.pipelineRunStatus[pipelineId] ?? initialStatus ?? 'never');
  const styles: Record<string, string> = {
    never: 'bg-slate-600',
    pending: 'bg-yellow-400 animate-pulse',
    running: 'bg-yellow-400 animate-pulse',
    success: 'bg-green-400',
    failed: 'bg-red-400'
  };
  const titles: Record<string, string> = {
    never: 'Never run',
    pending: 'Running',
    running: 'Running',
    success: 'Last run succeeded',
    failed: 'Last run failed'
  };
  return (
    <span
      className={cn('inline-block h-2 w-2 flex-shrink-0 rounded-full', styles[status])}
      title={titles[status]}
    />
  );
}

export interface SidebarProps {
  pipelines?: Pipeline[];
  currentPipelineId?: string | null;
  onLoadPipeline?: (id: string) => void;
  onNewPipeline?: () => void;
}

export default function Sidebar({
  pipelines = [],
  currentPipelineId = null,
  onLoadPipeline = () => {},
  onNewPipeline = () => {}
}: SidebarProps) {
  return (
    <div className="flex flex-col border-b border-slate-700 bg-slate-800/95">
      <div className="border-b border-slate-700 px-4 py-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
            <Workflow className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Workspace</div>
            <div className="text-sm font-semibold text-slate-100">Pipeline Library</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewPipeline}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500"
        >
          <FolderPlus className="h-4 w-4" />
          New Pipeline
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-2 px-1 text-[11px] uppercase tracking-[0.28em] text-slate-500">Saved Pipelines</div>
        <div className="space-y-2">
          {pipelines.length > 0 ? (
            pipelines.map((pipeline) => (
              <button
                key={pipeline.id ?? pipeline.name}
                type="button"
                onClick={() => pipeline.id && onLoadPipeline(pipeline.id)}
                className={cn(
                  'w-full rounded-2xl border px-3 py-3 text-left transition',
                  pipeline.id === currentPipelineId
                    ? 'border-brand-primary bg-slate-900 text-slate-100 shadow-lg shadow-indigo-950/30'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:bg-slate-900'
                )}
              >
                <div className="flex items-center gap-2">
                  {pipeline.id && (
                    <RunStatusDot pipelineId={pipeline.id} initialStatus={pipeline.latest_run_status} />
                  )}
                  <span className="truncate text-sm font-semibold">{pipeline.name}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {(pipeline.latest_run_at ?? pipeline.updated_at)
                    ? new Date(pipeline.latest_run_at ?? pipeline.updated_at ?? '').toLocaleString()
                    : 'Unsaved local pipeline'}
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-4 py-6 text-sm text-slate-400">
              No saved pipelines yet. Start a flow, then save it.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-700 px-4 py-3">
        <button
          type="button"
          onClick={() => navigateTo('/connections')}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-900"
        >
          <Link2 className="h-4 w-4" />
          Manage Connections
        </button>
      </div>
    </div>
  );
}
