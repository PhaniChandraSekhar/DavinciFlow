import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import StepPalette from '../components/palette/StepPalette';
import PipelineCanvas from '../components/canvas/PipelineCanvas';
import StepConfigPanel from '../components/config/StepConfigPanel';
import RunPanel from '../components/execution/RunPanel';
import { usePipelineStore } from '../store/pipelineStore';
import { useSaveShortcut } from '../hooks/useSaveShortcut';
import { usePipelineRunner } from '../hooks/usePipelineRunner';
import { savePipeline } from '../api/pipelines';

export default function DesignerPage() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const pipelineName = usePipelineStore((s) => s.pipelineName);
  const pipelineId = usePipelineStore((s) => s.pipelineId);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const markSaved = usePipelineStore((s) => s.markSaved);

  const { runPipeline } = usePipelineRunner();
  const [paletteOpen, setPaletteOpen] = useState(true);

  const handleSave = async () => {
    await savePipeline({
      id: pipelineId ?? undefined,
      name: pipelineName,
      nodes,
      edges,
    });
    markSaved();
  };

  useSaveShortcut(handleSave);

  return (
    <ReactFlowProvider>
      <AppLayout
        topBar={<TopBar mode="designer" onSave={handleSave} onRun={runPipeline} />}
        sidebar={<Sidebar />}
      >
        <div className="flex h-full overflow-hidden">
          {/* Step Palette — collapsible on mobile */}
          <div
            className={[
              'flex flex-col border-r border-slate-700 bg-slate-800 transition-all duration-200',
              paletteOpen ? 'w-[220px] min-w-[220px]' : 'w-0 min-w-0 overflow-hidden',
            ].join(' ')}
          >
            <StepPalette />
          </div>

          {/* Palette toggle button */}
          <button
            type="button"
            onClick={() => setPaletteOpen((v) => !v)}
            className="z-10 flex h-8 w-6 shrink-0 items-center justify-center self-start mt-3 rounded-r-lg border border-l-0 border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-100"
            title={paletteOpen ? 'Hide palette' : 'Show palette'}
          >
            {paletteOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Canvas + Run Panel */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-hidden">
              <PipelineCanvas />
            </div>
            <RunPanel />
          </div>

          {/* Config panel — only when node selected */}
          {selectedNodeId && (
            <div className="w-[300px] min-w-[300px] shrink-0 border-l border-slate-700 bg-slate-900/90 md:w-[320px]">
              <StepConfigPanel />
            </div>
          )}
        </div>
      </AppLayout>
    </ReactFlowProvider>
  );
}
