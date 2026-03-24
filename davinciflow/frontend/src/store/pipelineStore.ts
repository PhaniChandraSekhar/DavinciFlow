import { create } from 'zustand';
import type { Connection, Edge, Node } from '@xyflow/react';
import type { ConfigValue, Pipeline, PipelineEdge, PipelineNode } from '../types/pipeline';

type RunStatus = 'never' | 'running' | 'success' | 'failed';

interface PipelineStore {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNodeId: string | null;
  pipelineName: string;
  pipelineId: string | null;
  isDirty: boolean;
  pipelineRunStatus: Record<string, RunStatus>;
  setNodes: (nodes: PipelineNode[]) => void;
  setEdges: (edges: PipelineEdge[]) => void;
  setPipelineName: (name: string) => void;
  addNode: (node: PipelineNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodeConfig: (
    nodeId: string,
    config: Record<string, ConfigValue>
  ) => void;
  addEdge: (connection: Connection | Edge | PipelineEdge) => void;
  removeEdge: (edgeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setPipeline: (pipeline: Pipeline) => void;
  resetPipeline: () => void;
  markDirty: () => void;
  markSaved: () => void;
  loadTemplate: (templateId: 'ecommerce' | 'csv') => void;
  setRunStatus: (pipelineId: string, status: RunStatus) => void;
}

const makeNode = (
  id: string,
  nodeType: 'sourceNode' | 'transformNode' | 'sinkNode',
  stepType: string,
  label: string,
  description: string,
  category: 'source' | 'transform' | 'sink',
  config: Record<string, ConfigValue>,
  position: { x: number; y: number }
): PipelineNode => ({
  id,
  type: nodeType,
  position,
  data: {
    label,
    stepType,
    description,
    category,
    definition: {
      type: stepType,
      name: label,
      description,
      category,
      icon: 'database',
      config_schema: { properties: {} }
    },
    config
  }
});

const TEMPLATES: Record<string, { nodes: PipelineNode[]; edges: PipelineEdge[]; name: string }> = {
  ecommerce: {
    name: 'E-Commerce Analytics',
    nodes: [
      makeNode(
        'tpl-1', 'sourceNode', 'source.airbyte', 'Faker Source',
        'Extract fake e-commerce data via PyAirbyte', 'source',
        {
          source_name: 'source-faker',
          streams: ['products', 'purchases', 'users'],
          config_dict: { count: 500, seed: 42, parallelism: 1 },
          destination: 'duckdb',
          duckdb_path: '/tmp/davinciflow_cache.duckdb'
        },
        { x: 100, y: 150 }
      ),
      makeNode(
        'tpl-2', 'transformNode', 'transform.dbt', 'Revenue Summary (dbt)',
        'Run dbt transforms to aggregate revenue', 'transform',
        {
          dbt_project_dir: '/app/spike/dbt_project',
          profiles_dir: '/app/spike/dbt_project',
          select: 'transforms',
          target: 'dev',
          output_model: 'transforms.revenue_summary',
          duckdb_path: '/tmp/davinciflow_cache.duckdb'
        },
        { x: 420, y: 150 }
      )
    ],
    edges: [{ id: 'tpl-e1', source: 'tpl-1', target: 'tpl-2', animated: true }]
  },
  csv: {
    name: 'CSV Pipeline',
    nodes: [
      makeNode(
        'tpl-1', 'sourceNode', 'source.csv_input', 'CSV Input',
        'Read records from a CSV file', 'source',
        { file_path: '/data/input.csv' },
        { x: 100, y: 150 }
      ),
      makeNode(
        'tpl-2', 'sinkNode', 'sink.csv_output', 'CSV Output',
        'Write records to a CSV file', 'sink',
        { file_path: '/data/output.csv' },
        { x: 420, y: 150 }
      )
    ],
    edges: [{ id: 'tpl-e1', source: 'tpl-1', target: 'tpl-2', animated: true }]
  }
};

export const usePipelineStore = create<PipelineStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  pipelineName: 'Untitled Pipeline',
  pipelineId: null,
  isDirty: false,
  pipelineRunStatus: {},
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  setPipelineName: (pipelineName) => set({ pipelineName, isDirty: true }),
  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
      selectedNodeId: node.id,
      isDirty: true
    })),
  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true
    })),
  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  ...config
                }
              }
            }
          : node
      ),
      isDirty: true
    })),
  addEdge: (connection) =>
    set((state) => {
      if (!connection.source || !connection.target) {
        return state;
      }

      const edgeId =
        'id' in connection && connection.id
          ? connection.id
          : `edge-${connection.source}-${connection.target}`;

      if (state.edges.some((edge) => edge.id === edgeId)) {
        return state;
      }

      return {
        edges: [
          ...state.edges,
          {
            id: edgeId,
            source: connection.source,
            target: connection.target,
            animated: true
          }
        ],
        isDirty: true
      };
    }),
  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
      isDirty: true
    })),
  setSelectedNode: (selectedNodeId) => set({ selectedNodeId }),
  setPipeline: (pipeline) =>
    set({
      nodes: pipeline.nodes,
      edges: pipeline.edges,
      selectedNodeId: null,
      pipelineName: pipeline.name,
      pipelineId: pipeline.id ?? null,
      isDirty: false
    }),
  resetPipeline: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      pipelineName: 'Untitled Pipeline',
      pipelineId: null,
      isDirty: false
    }),
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false }),
  loadTemplate: (templateId) => {
    const tpl = TEMPLATES[templateId];
    if (!tpl) return;
    set({
      nodes: tpl.nodes,
      edges: tpl.edges,
      pipelineName: tpl.name,
      pipelineId: null,
      selectedNodeId: null,
      isDirty: true
    });
  },
  setRunStatus: (pipelineId, status) =>
    set((state) => ({
      pipelineRunStatus: { ...state.pipelineRunStatus, [pipelineId]: status }
    }))
}));

export const selectPipelineNodes = (state: PipelineStore) => state.nodes;
export const selectPipelineEdges = (state: PipelineStore) => state.edges;
