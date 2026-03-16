import { useCallback, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePipelineStore, selectPipelineNodes, selectPipelineEdges } from '../../store/pipelineStore';
import { categoryToNodeType, flattenStepLibrary, getDefaultStepConfig, FALLBACK_LIBRARY } from '../../api/steps';
import type { PipelineNode, StepDefinition } from '../../types/pipeline';

import SourceNode from './SourceNode';
import TransformNode from './TransformNode';
import SinkNode from './SinkNode';

const nodeTypes = {
  sourceNode: SourceNode,
  transformNode: TransformNode,
  sinkNode: SinkNode,
};

export default function PipelineCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = usePipelineStore(selectPipelineNodes);
  const edges = usePipelineStore(selectPipelineEdges);
  const addNode = usePipelineStore((s) => s.addNode);
  const addEdge = usePipelineStore((s) => s.addEdge);
  const setSelectedNode = usePipelineStore((s) => s.setSelectedNode);
  const setNodes = usePipelineStore((s) => s.setNodes);
  const setEdges = usePipelineStore((s) => s.setEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, nodes) as PipelineNode[]);
    },
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edges) as Edge[]);
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

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const stepType = event.dataTransfer.getData('application/davinciflow-step');
      if (!stepType) return;

      const allSteps = flattenStepLibrary(FALLBACK_LIBRARY);
      const definition = allSteps.find((s) => s.type === stepType) as StepDefinition | undefined;
      if (!definition) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

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
    [addNode, screenToFlowPosition]
  );

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
