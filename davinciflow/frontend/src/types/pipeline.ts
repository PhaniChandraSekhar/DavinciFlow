import type { Node } from '@xyflow/react';
import type { RunStatus } from './execution';

export type StepCategory = 'source' | 'transform' | 'sink';
export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [key: string]: ConfigValue };

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

export interface PipelineNodeData extends Record<string, unknown> {
  label: string;
  stepType: string;
  description: string;
  category: StepCategory;
  definition: StepDefinition;
  config: Record<string, ConfigValue>;
  status?: RunStatus;
}

export type PipelineNode = Node<PipelineNodeData, 'sourceNode' | 'transformNode' | 'sinkNode'>;

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
  latest_run_status?: 'pending' | 'running' | 'success' | 'failed';
  latest_run_at?: string;
}
