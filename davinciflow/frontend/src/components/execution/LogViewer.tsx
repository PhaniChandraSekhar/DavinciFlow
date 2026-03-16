import { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';
import type { RunLog } from '../../types/execution';

interface LogViewerProps {
  logs: RunLog[];
}

const levelColors: Record<string, string> = {
  INFO: 'text-emerald-400',
  WARN: 'text-amber-400',
  ERROR: 'text-rose-400',
  DEBUG: 'text-slate-500',
};

export default function LogViewer({ logs }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={containerRef}
      className="h-40 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-xs"
    >
      {logs.length === 0 ? (
        <div className="text-slate-600">Waiting for logs...</div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="py-0.5">
            <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
            <span className={cn('font-semibold', levelColors[log.level] ?? 'text-slate-400')}>
              {log.level}
            </span>{' '}
            <span className="text-slate-300">{log.message}</span>
          </div>
        ))
      )}
    </div>
  );
}
