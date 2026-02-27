import './ConnectionList.css';

interface Connection {
  id: string;
  source: string;
  target: string;
  bytesIn: number;
  bytesOut: number;
  status: 'active' | 'closed';
}

interface ConnectionListProps {
  connections: Connection[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export default function ConnectionList({ connections, selectedId, onSelect }: ConnectionListProps) {
  if (connections.length === 0) {
    return (
      <div className="connection-list-empty">
        <p className="text-muted text-sm">暂无连接</p>
      </div>
    );
  }

  return (
    <div className="connection-list">
      {connections.map((conn) => (
        <div
          key={conn.id}
          className={`connection-item ${selectedId === conn.id ? 'selected' : ''} ${conn.status}`}
          onClick={() => onSelect?.(conn.id)}
        >
          <div className="connection-header">
            <span className="connection-source">{conn.source}</span>
            <span className={`connection-status status-${conn.status}`}>
              {conn.status === 'active' ? '●' : '○'}
            </span>
          </div>
          <div className="connection-target text-xs text-muted">
            → {conn.target}
          </div>
          <div className="connection-stats text-xs text-muted">
            <span>↓ {formatBytes(conn.bytesIn)}</span>
            <span>↑ {formatBytes(conn.bytesOut)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}
