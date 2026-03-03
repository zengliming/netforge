import { useEffect, useRef, useState } from 'react';
import './LogPanel.css';

interface LogPanelProps {
  logs: { message: string; timestamp: number }[];
  title?: string;
}

export default function LogPanel({ logs, title = '日志' }: LogPanelProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (logContainerRef.current && !isCollapsed) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false });
  };

  return (
    <div className={`log-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="log-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="log-title">
          <span className="log-icon">📋</span>
          {title}
        </span>
        <button
          className="log-toggle"
          aria-label={isCollapsed ? '展开' : '收起'}
        >
          <span className={`toggle-arrow ${isCollapsed ? 'up' : 'down'}`}>▼</span>
        </button>
      </div>
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
