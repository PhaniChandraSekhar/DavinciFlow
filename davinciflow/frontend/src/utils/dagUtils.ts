import type { PipelineEdge, PipelineNode } from '../types/pipeline';

export function topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = [...nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0).map((node) => node.id)];
  const ordered: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (!nodeId) {
      continue;
    }

    ordered.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const nextDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, nextDegree);

      if (nextDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (ordered.length !== nodes.length) {
    const remaining = nodes.map((node) => node.id).filter((id) => !ordered.includes(id));
    return [...ordered, ...remaining];
  }

  return ordered;
}
