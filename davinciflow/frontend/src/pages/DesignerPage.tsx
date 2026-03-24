import { useEffect, useState } from 'react';
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
import { getPipeline, getPipelines, savePipeline } from '../api/pipelines';
import type { Pipeline } from '../types/pipeline';
import { useExecutionStore } from '../store/executionStore';

export default function DesignerPage() {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const pipelineName = usePipelineStore((s) => s.pipelineName);
  const pipelineId = usePipelineStore((s) => s.pipelineId);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const markSaved = usePipelineStore((s) => s.markSaved);
  const resetPipeline = usePipelineStore((s) => s.resetPipeline);
  const setPipeline = usePipelineStore((s) => s.setPipeline);
  const setPipelineName = usePipelineStore((s) => s.setPipelineName);
  const setRunStatus = usePipelineStore((s) => s.setRunStatus);
  const isDirty = usePipelineStore((s) => s.isDirty);
  const isRunning = useExecutionStore((s) => s.isRunning);

  const { runPipeline } = usePipelineRunner();
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [savedPipelines, setSavedPipelines] = useState<Pipeline[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  async function refreshPipelines() {
    try {
      const items = await getPipelines();
      for (const item of items) {
        if (item.id && item.latest_run_status) {
          setRunStatus(item.id, item.latest_run_status === 'pending' ? 'running' : item.latest_run_status);
        }
      }
      setSavedPipelines(items);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load pipelines.');
    }
  }

  useEffect(() => {
    void refreshPipelines();
  }, []);

  const handleSave = async () => {
    const saved = await savePipeline({
      id: pipelineId ?? undefined,
      name: pipelineName,
      nodes,
      edges,
    });
    setPipeline(saved);
    markSaved();
    await refreshPipelines();
    setPageError(null);
    return saved;
  };

  const handleLoadPipeline = async (id: string) => {
    try {
      const pipeline = await getPipeline(id);
      setPipeline(pipeline);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load pipeline.');
    }
  };

  const handleNewPipeline = () => {
    resetPipeline();
  };

  const handleRun = async () => {
    try {
      const saved = pipelineId ? null : await handleSave();
      const targetPipelineId = pipelineId ?? saved?.id;
      if (!targetPipelineId) {
        return;
      }
      await runPipeline(targetPipelineId);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to run pipeline.');
    }
  };

  useSaveShortcut(async () => {
    try {
      await handleSave();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save pipeline.');
    }
  });

  return (
    <ReactFlowProvider>
      <AppLayout
        topBar={
          <TopBar
            mode="designer"
            pipelineName={pipelineName}
            onPipelineNameChange={setPipelineName}
            onSave={async () => {
              try {
                await handleSave();
              } catch (error) {
                setPageError(error instanceof Error ? error.message : 'Failed to save pipeline.');
              }
            }}
            onRun={handleRun}
            isDirty={isDirty}
            isRunning={isRunning}
            canRun={nodes.length > 0 && pipelineName.trim().length > 0}
          />
        }
        sidebar={
          <Sidebar
            pipelines={savedPipelines}
            currentPipelineId={pipelineId}
            onLoadPipeline={handleLoadPipeline}
            onNewPipeline={handleNewPipeline}
          />
        }
      >
        <div className="flex h-full overflow-hidden">
          <div
            className={[
              'flex flex-col border-r border-slate-700 bg-slate-800 transition-all duration-200',
              paletteOpen ? 'w-[220px] min-w-[220px]' : 'w-0 min-w-0 overflow-hidden',
            ].join(' ')}
          >
            <StepPalette />
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen((v) => !v)}
            className="z-10 mt-3 flex h-8 w-6 shrink-0 items-center justify-center self-start rounded-r-lg border border-l-0 border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-100"
            title={paletteOpen ? 'Hide palette' : 'Show palette'}
          >
            {paletteOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </button>

          <div className="flex min-w-0 flex-1 flex-col">
            {pageError ? (
              <div className="border-b border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                {pageError}
              </div>
            ) : null}
            <div className="flex-1 overflow-hidden">
              <PipelineCanvas />
            </div>
            <RunPanel />
          </div>

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
