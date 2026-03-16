import type { ReactNode } from 'react';

export interface AppLayoutProps {
  topBar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  configPanel?: ReactNode;
  logPanel?: ReactNode;
  showConfig?: boolean;
  showLogs?: boolean;
}

export default function AppLayout({
  topBar,
  sidebar,
  children,
  configPanel,
  logPanel,
  showConfig = false,
  showLogs = false
}: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <div className="shrink-0">{topBar}</div>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-slate-700 bg-slate-800">
          {sidebar}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        {showConfig ? (
          <section className="flex w-[320px] shrink-0 flex-col border-l border-slate-700 bg-slate-900/90">
            {configPanel}
          </section>
        ) : null}
      </div>
      {showLogs ? (
        <div className="h-[220px] shrink-0 border-t border-slate-700 bg-slate-950/95">{logPanel}</div>
      ) : null}
    </div>
  );
}
