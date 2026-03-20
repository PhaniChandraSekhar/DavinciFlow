import type { DragEvent, TouchEvent } from 'react';
import type { StepDefinition } from '../../types/pipeline';
import { cn } from '../../utils/cn';
import { StepGlyph } from '../stepIcons';

const accentClasses = {
  source: 'border-l-blue-500',
  transform: 'border-l-purple-500',
  sink: 'border-l-emerald-500'
};

// Global state for touch-based drag (mobile)
let touchDragStepType: string | null = null;

export function getTouchDragStepType() {
  return touchDragStepType;
}

interface StepCardProps {
  step: StepDefinition;
}

export default function StepCard({ step }: StepCardProps) {
  // Desktop: HTML5 drag
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/davinciflow-step', step.type);
  }

  // Mobile: touch drag start — store step type globally
  function handleTouchStart(_event: TouchEvent<HTMLDivElement>) {
    touchDragStepType = step.type;
    // Visual feedback
    const el = _event.currentTarget;
    el.style.opacity = '0.6';
    el.style.transform = 'scale(0.97)';
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    el.style.opacity = '';
    el.style.transform = '';

    if (!touchDragStepType) return;

    // Find the canvas element and dispatch a custom event with touch coordinates
    const touch = event.changedTouches[0];
    const canvasEl = document.querySelector('.pipeline-canvas');
    if (canvasEl && touch) {
      const dropEvent = new CustomEvent('davinciflow:touchdrop', {
        bubbles: true,
        detail: {
          stepType: touchDragStepType,
          clientX: touch.clientX,
          clientY: touch.clientY,
        },
      });
      canvasEl.dispatchEvent(dropEvent);
    }
    touchDragStepType = null;
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'group rounded-2xl border border-slate-700 bg-slate-800/70 p-3 transition',
        'hover:cursor-grab hover:border-slate-500 hover:bg-slate-700',
        'active:scale-95 active:opacity-70 touch-none select-none',
        'border-l-4',
        accentClasses[step.category]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80">
          <StepGlyph icon={step.icon} className="h-4.5 w-4.5 text-slate-200" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-100">{step.name}</div>
          <div className="line-clamp-2 text-xs text-slate-400">{step.description}</div>
        </div>
      </div>
    </div>
  );
}
