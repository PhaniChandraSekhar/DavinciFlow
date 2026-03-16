import type { RunStatus } from './execution';

export type StepCategory = 'source' | 'transform' | 'sink';

export interface StepConfigFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'connection';
  title: string;
  description?: string;
  default?: string | number | boolean;
  placeholder?: string;
  enum?: string[];
  connectionType?: string | string[];
}

export interface StepDefinition {
  type: string;
  name: string;
  description: string;
  category: StepCategory;
  icon: string;
  config_schema: {
    properties: Record<string, StepConfigFieldSchema>;
    required?: string[];
  };
}

export interface PipelineNodeData {
  label: string;
  stepType: string;
  description: string;
  category: StepCategory;
  definition: StepDefinition;
  config: Record<string, string | number | boolean>;
  status?: RunStatus;
}

export interface PipelineNode {
  id: string;
  type: 'sourceNode' | 'transformNode' | 'sinkNode';
  position: { x: number; y: number };
  data: PipelineNodeData;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  label?: string;
}

export interface Pipeline {
  id?: string;
  name: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  updated_at?: string;
}
