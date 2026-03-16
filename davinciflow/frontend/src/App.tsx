import { DatabaseZap, Link2, Workflow } from 'lucide-react';
import AppLayout from './components/layout/AppLayout';
import TopBar from './components/layout/TopBar';
import DesignerPage from './pages/DesignerPage';
import { usePathname } from './utils/navigation';

function ConnectionsPlaceholder() {
  return (
    <AppLayout
      topBar={<TopBar mode="connections" />}
      sidebar={
        <div className="flex h-full flex-col border-b border-slate-700 bg-slate-800/95">
          <div className="border-b border-slate-700 px-4 py-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
                <Workflow className="h-5 w-5 text-brand.primary" />
                <DatabaseZap className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-950 p-0.5 text-brand.sink" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Registry</div>
                <div className="text-sm font-semibold text-slate-100">Connections</div>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-4 text-sm text-slate-400">
              Connection management is outside this frontend pass.
            </div>
          </div>
        </div>
      }
      canvas={
        <div className="pipeline-canvas flex h-full items-center justify-center p-6">
          <div className="panel-surface max-w-xl rounded-[28px] px-8 py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80">
              <Link2 className="h-6 w-6 text-slate-200" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-100">Connection Registry</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The designer view is fully wired. The connection registry route is reserved for a later
              pass, so this placeholder keeps navigation coherent without introducing partial CRUD.
            </p>
          </div>
        </div>
      }
    />
  );
}

export default function App() {
  const pathname = usePathname();

  if (pathname === '/connections') {
    return <ConnectionsPlaceholder />;
  }

  return <DesignerPage />;
}
