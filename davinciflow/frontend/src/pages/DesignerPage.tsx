import { ReactFlowProvider } from '@xyflow/react';
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
        <div className="flex h-full">
          <StepPalette />
          <div className="flex flex-1 flex-col">
            <div className="flex-1">
              <PipelineCanvas />
            </div>
            <RunPanel />
          </div>
          {selectedNodeId && <StepConfigPanel />}
        </div>
      </AppLayout>
    </ReactFlowProvider>
  );
}
