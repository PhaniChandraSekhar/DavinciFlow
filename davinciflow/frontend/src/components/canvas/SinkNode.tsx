import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { cn } from '../../utils/cn';
import type { PipelineNodeData } from '../../types/pipeline';
import { StepGlyph } from '../stepIcons';

type SinkNodeType = Node<PipelineNodeData, 'sinkNode'>;

const statusTone: Record<string, string> = {
  idle: 'border-slate-700 bg-slate-900 text-slate-300',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  running: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  failed: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

export default function SinkNode({ data, selected }: NodeProps<SinkNodeType>) {
  const nodeData = data as unknown as PipelineNodeData;
  const status = (nodeData as any).status ?? 'idle';

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-2xl border border-slate-700/90 bg-slate-900/95 p-4 shadow-xl transition',
        selected && 'ring-2 ring-emerald-500/40'
      )}
    >
      <Handle type="target" position={Position.Top} className="!border-emerald-500/70 !bg-slate-950" />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
            <StepGlyph icon={nodeData.definition?.icon ?? 'database'} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{nodeData.label}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Sink</div>
          </div>
        </div>
        <div className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase', statusTone[status] ?? statusTone.idle)}>
          {status}
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-5">{nodeData.description}</p>
    </div>
  );
}
