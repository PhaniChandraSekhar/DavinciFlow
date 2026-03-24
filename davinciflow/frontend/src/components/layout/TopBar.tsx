import { CircleDot, DatabaseZap, LogOut, Play, Save, Settings2, Workflow } from 'lucide-react';
import { cn } from '../../utils/cn';
import { navigateTo } from '../../utils/navigation';

interface TopBarProps {
  mode?: 'designer' | 'connections';
  pipelineName?: string;
  onPipelineNameChange?: (value: string) => void;
  onSave?: () => void | Promise<void>;
  onRun?: () => void | Promise<void>;
  authUsername?: string;
  onLogout?: () => void | Promise<void>;
  isDirty?: boolean;
  isRunning?: boolean;
  canRun?: boolean;
}

export default function TopBar({
  mode = 'designer',
  pipelineName = '',
  onPipelineNameChange,
  onSave,
  onRun,
  authUsername,
  onLogout,
  isDirty = false,
  isRunning = false,
  canRun = false
}: TopBarProps) {
  const statusLabel = isRunning ? 'Running' : isDirty ? 'Unsaved changes' : 'Saved';
  const statusTone = isRunning ? 'bg-amber-400' : isDirty ? 'bg-sky-400' : 'bg-emerald-400';

  return (
    <header className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-5 py-3">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => navigateTo('/')}
          className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left transition hover:border-slate-500 hover:bg-slate-950"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary via-sky-500 to-brand-sink shadow-lg shadow-indigo-950/50">
            <Workflow className="h-5 w-5 text-white" />
            <DatabaseZap className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-950 p-0.5 text-brand-sink" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.24em] text-slate-100">DAVINCIFLOW</div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Visual ELT Studio</div>
          </div>
        </button>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] transition',
              mode === 'designer'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            Designer
          </button>
          <button
            type="button"
            onClick={() => navigateTo('/connections')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] transition',
              mode === 'connections'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            Connections
          </button>
        </div>
      </div>

      {mode === 'designer' ? (
        <div className="flex min-w-0 items-center gap-4">
          <label className="min-w-[280px] rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 focus-within:border-brand-primary">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Pipeline Name
            </span>
            <input
              value={pipelineName}
              onChange={(event) => onPipelineNameChange?.(event.target.value)}
              className="w-full border-0 bg-transparent p-0 text-lg font-semibold text-slate-100 focus:ring-0"
            />
          </label>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-2 md:flex">
              <CircleDot className={cn('h-3.5 w-3.5', statusTone)} fill="currentColor" />
              <span className="text-xs uppercase tracking-[0.24em] text-slate-300">{statusLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => void onSave?.()}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700"
            >
              <Save className="h-4 w-4" />
              Save
              <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Ctrl+S
              </span>
            </button>
            <button
              type="button"
              onClick={() => void onRun?.()}
              disabled={!canRun || isRunning}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running' : 'Run'}
            </button>
            {onLogout ? (
              <button
                type="button"
                onClick={() => void onLogout()}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                <span className="hidden text-xs uppercase tracking-[0.18em] text-slate-400 lg:inline">
                  {authUsername ?? 'Session'}
                </span>
                <LogOut className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-right">
          {onLogout ? (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="mr-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <span className="hidden text-xs uppercase tracking-[0.18em] text-slate-400 lg:inline">
                {authUsername ?? 'Session'}
              </span>
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-100">Connection Registry</div>
            <div className="text-xs text-slate-400">Reusable credentials for source and sink steps</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70">
            <Settings2 className="h-5 w-5 text-slate-300" />
          </div>
        </div>
      )}
    </header>
  );
}
