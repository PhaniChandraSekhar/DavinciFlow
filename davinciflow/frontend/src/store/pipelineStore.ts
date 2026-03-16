import { create } from 'zustand';
import type { Connection, Edge, Node } from '@xyflow/react';
import type { Pipeline, PipelineEdge, PipelineNode } from '../types/pipeline';

interface PipelineStore {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNodeId: string | null;
  pipelineName: string;
  pipelineId: string | null;
  isDirty: boolean;
  setNodes: (nodes: PipelineNode[]) => void;
  setEdges: (edges: PipelineEdge[]) => void;
  setPipelineName: (name: string) => void;
  addNode: (node: PipelineNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodeConfig: (
    nodeId: string,
    config: Record<string, string | number | boolean>
  ) => void;
  addEdge: (connection: Connection | Edge | PipelineEdge) => void;
  removeEdge: (edgeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setPipeline: (pipeline: Pipeline) => void;
  markDirty: () => void;
  markSaved: () => void;
}

export const usePipelineStore = create<PipelineStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  pipelineName: 'Untitled Pipeline',
  pipelineId: null,
  isDirty: false,
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
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false })
}));

export const selectPipelineNodes = (state: PipelineStore) => state.nodes as Node[];
export const selectPipelineEdges = (state: PipelineStore) => state.edges as Edge[];
