interface FooterProps {
  logs: { message: string; timestamp: number }[];
  version?: string;
}

export default function Footer({ logs, version = 'v0.1.0' }: FooterProps) {
  return (
    <div className="app-footer">
      <div className="log-area">
        <div className="log-header">日志</div>
        <div className="log-content">
          {logs.map((log, i) => (
            <div key={i} className="log-entry">
              <span className="log-time">
                [{new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}]
              </span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="status-bar">
        <span className="version">{version}</span>
      </div>
    </div>
  );
}
