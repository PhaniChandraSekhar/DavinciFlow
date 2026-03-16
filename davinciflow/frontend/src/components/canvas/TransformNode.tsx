import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '../../utils/cn';
import type { PipelineNode } from '../../types/pipeline';
import { StepGlyph } from '../stepIcons';

const statusTone = {
  idle: 'border-slate-700 bg-slate-900 text-slate-300',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  running: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  failed: 'border-rose-500/30 bg-rose-500/10 text-rose-200'
} as const;

export default function TransformNode({ data, selected }: NodeProps<PipelineNode>) {
  const status = data.status ?? 'idle';

  return (
    <div
      className={cn(
        'min-w-[220px] rounded-[26px] border border-slate-700/90 bg-slate-900/95 p-4 shadow-2xl shadow-slate-950/60 transition',
        selected && 'border-brand-transform ring-2 ring-brand-transform/30'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!border-brand-transform/70 !bg-slate-950"
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-transform/30 bg-brand-transform/15 text-brand-transform">
            <StepGlyph icon={data.definition.icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{data.label}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">Transform</div>
          </div>
        </div>
        <div
          className={cn(
            'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
            statusTone[status]
          )}
        >
          {status}
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-400">{data.description}</p>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-brand-transform/70 !bg-slate-950"
      />
    </div>
  );
}
