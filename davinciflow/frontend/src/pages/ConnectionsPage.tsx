import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import { getConnections, saveConnection, deleteConnection } from '../api/connections';
import type { Connection, ConnectionType } from '../types/connection';

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [editing, setEditing] = useState<Connection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  async function refreshConnections() {
    try {
      const items = await getConnections();
      setConnections(items);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load connections.');
    }
  }

  useEffect(() => {
    void refreshConnections();
  }, []);

  const handleSave = async (conn: Connection) => {
    try {
      await saveConnection(conn);
      await refreshConnections();
      setIsModalOpen(false);
      setEditing(null);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save connection.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConnection(id);
      await refreshConnections();
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete connection.');
    }
  };

  const openNew = () => {
    setEditing({
      name: '',
      type: 'postgres',
      config: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  return (
    <AppLayout
      topBar={<TopBar mode="connections" />}
      sidebar={<Sidebar />}
    >
      <div className="p-6">
        {pageError ? (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {pageError}
          </div>
        ) : null}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">Connections</h1>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Connection
          </button>
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-900/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-left text-slate-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {connections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No connections yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                connections.map((conn) => (
                  <tr key={conn.id} className="border-b border-slate-800/60">
                    <td className="px-4 py-3 text-slate-100">{conn.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300">
                        {conn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(conn.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditing(conn);
                          setIsModalOpen(true);
                        }}
                        className="mr-2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => conn.id && handleDelete(conn.id)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {isModalOpen && editing && (
          <ConnectionModal
            connection={editing}
            onSave={handleSave}
            onClose={() => {
              setIsModalOpen(false);
              setEditing(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

interface ConnectionModalProps {
  connection: Connection;
  onSave: (conn: Connection) => void;
  onClose: () => void;
}

function ConnectionModal({ connection, onSave, onClose }: ConnectionModalProps) {
  const [name, setName] = useState(connection.name);
  const [type, setType] = useState<ConnectionType>(connection.type);
  const [host, setHost] = useState(String(connection.config.host ?? ''));
  const [port, setPort] = useState(String(connection.config.port ?? ''));
  const [database, setDatabase] = useState(String(connection.config.database ?? ''));
  const [username, setUsername] = useState(String(connection.config.username ?? ''));
  const [password, setPassword] = useState(String(connection.config.password ?? ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...connection,
      name,
      type,
      config: { host, port, database, username, password },
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          {connection.name ? 'Edit Connection' : 'New Connection'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ConnectionType)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="snowflake">Snowflake</option>
              <option value="s3">S3 / MinIO</option>
              <option value="api">REST API</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Port</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="5432"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Database</label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Saved secrets stay masked. Leave the masked value as-is to keep the current secret.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
