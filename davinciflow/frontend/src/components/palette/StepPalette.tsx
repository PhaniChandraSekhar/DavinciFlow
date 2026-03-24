import { useState } from 'react';
import { ChevronDown, ChevronRight, LoaderCircle, Zap } from 'lucide-react';
import { useStepLibrary } from '../../hooks/useStepLibrary';
import type { StepDefinition } from '../../types/pipeline';
import StepCard from './StepCard';
import { usePipelineStore } from '../../store/pipelineStore';

const sectionMeta = [
  { key: 'sources', label: 'Sources' },
  { key: 'transforms', label: 'Transforms' },
  { key: 'sinks', label: 'Sinks' }
] as const;

export default function StepPalette() {
  const { data, error, isLoading } = useStepLibrary();
  const loadTemplate = usePipelineStore((s) => s.loadTemplate);
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
        {/* Quick-start templates */}
        <div className="mb-3 rounded-2xl border border-indigo-700/50 bg-indigo-950/40">
          <div className="flex items-center gap-2 px-4 py-3">
            <Zap className="h-4 w-4 text-indigo-400" />
            <div>
              <div className="text-sm font-semibold text-slate-100">Templates</div>
              <div className="text-xs text-slate-500">Load a pre-built pipeline</div>
            </div>
          </div>
          <div className="space-y-2 border-t border-indigo-700/30 px-3 py-3">
            <button
              type="button"
              onClick={() => loadTemplate('ecommerce')}
              className="w-full rounded-xl border border-indigo-700/40 bg-indigo-900/30 px-3 py-2 text-left text-sm text-indigo-200 transition hover:bg-indigo-900/60"
            >
              <div className="font-medium">E-Commerce Analytics</div>
              <div className="text-xs text-indigo-400/70">Faker → DuckDB → dbt transforms</div>
            </button>
            <button
              type="button"
              onClick={() => loadTemplate('csv')}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-900/70"
            >
              <div className="font-medium">CSV Pipeline</div>
              <div className="text-xs text-slate-500">CSV input → CSV output</div>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-8 text-sm text-slate-400">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading step library
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-4 text-sm text-rose-200">
            {error instanceof Error ? error.message : 'Failed to load step library.'}
          </div>
        ) : null}

        {!isLoading && !error &&
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
