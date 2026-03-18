import { useCallback, useEffect, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type Connection,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePipelineStore, selectPipelineNodes, selectPipelineEdges } from '../../store/pipelineStore';
import { categoryToNodeType, getDefaultStepConfig } from '../../api/steps';
import { useStepLibrary } from '../../hooks/useStepLibrary';
import type { PipelineEdge, PipelineNode, StepDefinition } from '../../types/pipeline';
import type { NodeTypes } from '@xyflow/react';

import SourceNode from './SourceNode';
import TransformNode from './TransformNode';
import SinkNode from './SinkNode';

const nodeTypes: NodeTypes = {
  sourceNode: SourceNode as NodeTypes[string],
  transformNode: TransformNode as NodeTypes[string],
  sinkNode: SinkNode as NodeTypes[string],
};

export default function PipelineCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { data: stepLibrary } = useStepLibrary();

  const nodes = usePipelineStore(selectPipelineNodes);
  const edges = usePipelineStore(selectPipelineEdges);
  const addNode = usePipelineStore((s) => s.addNode);
  const addEdge = usePipelineStore((s) => s.addEdge);
  const setSelectedNode = usePipelineStore((s) => s.setSelectedNode);
  const setNodes = usePipelineStore((s) => s.setNodes);
  const setEdges = usePipelineStore((s) => s.setEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange<PipelineNode>[]) => {
      setNodes(applyNodeChanges(changes, nodes));
    },
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<PipelineEdge>[]) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      addEdge(connection);
    },
    [addEdge]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Shared drop handler used by both desktop drag and mobile touch
  const dropStep = useCallback(
    (stepType: string, clientX: number, clientY: number) => {
      const allSteps = stepLibrary
        ? [...stepLibrary.sources, ...stepLibrary.transforms, ...stepLibrary.sinks]
        : [];
      const definition = allSteps.find((s) => s.type === stepType) as StepDefinition | undefined;
      if (!definition) return;

      const position = screenToFlowPosition({ x: clientX, y: clientY });

      const newNode: PipelineNode = {
        id: `node-${Date.now()}`,
        type: categoryToNodeType(definition.category),
        position,
        data: {
          label: definition.name,
          stepType: definition.type,
          description: definition.description,
          category: definition.category,
          definition,
          config: getDefaultStepConfig(definition),
        },
      };

      addNode(newNode);
    },
    [addNode, screenToFlowPosition, stepLibrary]
  );

  // Desktop drop
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const stepType = event.dataTransfer.getData('application/davinciflow-step');
      if (!stepType) return;
      dropStep(stepType, event.clientX, event.clientY);
    },
    [dropStep]
  );

  // Mobile touch drop — listen for custom event dispatched by StepCard
  useEffect(() => {
    const el = reactFlowWrapper.current;
    if (!el) return;

    function handleTouchDrop(event: Event) {
      const { stepType, clientX, clientY } = (event as CustomEvent).detail;
      if (stepType) dropStep(stepType, clientX, clientY);
    }

    el.addEventListener('davinciflow:touchdrop', handleTouchDrop);
    return () => el.removeEventListener('davinciflow:touchdrop', handleTouchDrop);
  }, [dropStep]);

  return (
    <div ref={reactFlowWrapper} className="h-full w-full pipeline-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(100,116,139,0.15)" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'sourceNode') return '#3B82F6';
            if (node.type === 'transformNode') return '#8B5CF6';
            if (node.type === 'sinkNode') return '#10B981';
            return '#64748b';
          }}
          maskColor="rgba(15,23,42,0.85)"
        />
      </ReactFlow>
    </div>
  );
}
