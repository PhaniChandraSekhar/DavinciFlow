import ReactFlow, { Background, Controls, Edge, MiniMap, Node } from "reactflow";
import "reactflow/dist/style.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const nodes: Node[] = [
  {
    id: "extract",
    data: { label: "Extract: PostgreSQL" },
    position: { x: 40, y: 120 },
    style: { background: "#fff7e6", border: "1px solid #f59e0b", width: 180 },
  },
  {
    id: "transform",
    data: { label: "Transform: SQL Mapper" },
    position: { x: 300, y: 120 },
    style: { background: "#ecfeff", border: "1px solid #0891b2", width: 190 },
  },
  {
    id: "load",
    data: { label: "Load: MinIO + Warehouse" },
    position: { x: 580, y: 120 },
    style: { background: "#f0fdf4", border: "1px solid #16a34a", width: 210 },
  },
];
const edges: Edge[] = [
  { id: "e1-2", source: "extract", target: "transform", animated: true },
  { id: "e2-3", source: "transform", target: "load", animated: true },
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="eyebrow">DavinciFlow</p>
        <h1>Visual ELT pipelines for constrained environments.</h1>
        <p className="lede">
          Design ingestion and transformation flows with reusable connectors, versioned runs,
          and deployment-friendly infrastructure.
        </p>
        <div className="card-grid">
          <section className="card">
            <span>18+</span>
            <p>Built-in pipeline steps</p>
          </section>
          <section className="card">
            <span>6</span>
            <p>Connector families</p>
          </section>
          <section className="card">
            <span>API</span>
            <p>{apiUrl}</p>
          </section>
        </div>
      </aside>
      <main className="canvas">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <MiniMap />
          <Controls />
          <Background gap={24} size={1} />
        </ReactFlow>
      </main>
    </div>
  );
}
