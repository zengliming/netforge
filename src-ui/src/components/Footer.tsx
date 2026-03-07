import { useRef, useEffect } from 'react';

interface FooterProps {
  logs: { message: string; timestamp: number }[];
  version?: string;
}

export default function Footer({ logs, version = 'v0.1.0' }: FooterProps) {
  const logContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContentRef.current) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col bg-[var(--color-bg-secondary)] border-t border-[var(--color-bg-elevated)]">
      <div className="h-[150px] min-h-[100px] flex flex-col">
        <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-bg-elevated)] bg-[var(--color-bg-tertiary)] flex items-center justify-between font-mono">
          <span>日志</span>
          <span className="text-[var(--color-text-muted)]">{logs.length} 条记录</span>
        </div>
        <div
          ref={logContentRef}
          className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs bg-[var(--color-bg-primary)]"
        >
          {logs.map((log, i) => (
            <div key={i} className="mb-1 flex gap-2">
              <span className="text-[var(--color-text-muted)] shrink-0">
                [{new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}]
              </span>
              <span className="text-[var(--color-text-secondary)] break-all">
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center px-3 py-1.5 bg-[var(--color-bg-primary)] border-t border-[var(--color-bg-elevated)] text-xs font-mono">
        <span className="text-[var(--color-text-muted)] ml-auto">{version}</span>
      </div>
    </div>
  );
}
