import { useState } from 'react';
import { ChevronDown, ChevronRight, LoaderCircle } from 'lucide-react';
import { useStepLibrary } from '../../hooks/useStepLibrary';
import type { StepDefinition } from '../../types/pipeline';
import StepCard from './StepCard';

const sectionMeta = [
  { key: 'sources', label: 'Sources' },
  { key: 'transforms', label: 'Transforms' },
  { key: 'sinks', label: 'Sinks' }
] as const;

export default function StepPalette() {
  const { data, isLoading } = useStepLibrary();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sources: true,
    transforms: true,
    sinks: true
  });

  function toggleSection(section: string) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section]
    }));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-800">
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Step Palette</div>
        <div className="mt-1 text-sm text-slate-500">Drag steps onto the canvas to build a run graph.</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-8 text-sm text-slate-400">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading step library
          </div>
        ) : null}

        {!isLoading &&
          sectionMeta.map((section) => {
            const steps = (data?.[section.key] ?? []) as StepDefinition[];
            const isOpen = openSections[section.key];
            const ToggleIcon = isOpen ? ChevronDown : ChevronRight;

            return (
              <div key={section.key} className="mb-3 rounded-2xl border border-slate-700 bg-slate-900/70">
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{section.label}</div>
                    <div className="text-xs text-slate-500">{steps.length} available steps</div>
                  </div>
                  <ToggleIcon className="h-4 w-4 text-slate-400" />
                </button>
                {isOpen ? (
                  <div className="space-y-2 border-t border-slate-700 px-3 py-3">
                    {steps.map((step) => (
                      <StepCard key={step.type} step={step} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
      </div>
    </div>
  );
}
