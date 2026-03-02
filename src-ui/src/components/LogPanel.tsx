import { useEffect, useRef } from 'react';
import './LogPanel.css';

interface LogPanelProps {
  logs: { message: string; timestamp: number }[];
  title?: string;
}

export default function LogPanel({ logs, title = '日志' }: LogPanelProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false });
  };

  return (
    <div className="log-panel">
      <div className="log-header">{title}</div>
      <div className="log-content" ref={logContainerRef}>
        {logs.length === 0 ? (
          <div className="log-empty">暂无日志</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="log-entry">
              <span className="log-time">[{formatTimestamp(log.timestamp)}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
