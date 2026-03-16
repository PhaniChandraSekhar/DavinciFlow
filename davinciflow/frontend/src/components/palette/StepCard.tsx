import type { DragEvent } from 'react';
import type { StepDefinition } from '../../types/pipeline';
import { cn } from '../../utils/cn';
import { StepGlyph } from '../stepIcons';

const accentClasses = {
  source: 'border-l-brand.source',
  transform: 'border-l-brand.transform',
  sink: 'border-l-brand.sink'
};

interface StepCardProps {
  step: StepDefinition;
}

export default function StepCard({ step }: StepCardProps) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/davinciflow-step', step.type);
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'group rounded-2xl border border-slate-700 bg-slate-800/70 p-3 transition hover:cursor-grab hover:border-slate-500 hover:bg-slate-700',
        'border-l-4',
        accentClasses[step.category]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80">
          <StepGlyph icon={step.icon} className="h-4.5 w-4.5 text-slate-200" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100">{step.name}</div>
          <div className="truncate text-xs text-slate-400">{step.description}</div>
        </div>
      </div>
    </div>
  );
}
