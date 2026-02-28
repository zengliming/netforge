import type { ProxyInstance, Connection } from '../types';
import InstanceCard from './InstanceCard';
import './ProxyTab.css';

interface ProxyTabProps {
  instances: ProxyInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  connections: Connection[];
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}

export default function ProxyTab({
  instances,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  connections,
  onStart,
  onStop,
}: ProxyTabProps) {
  const selectedInstance = instances.find((i) => i.id === selectedId);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="tab-container">
      <div className="tab-sidebar">
        <div className="sidebar-header">
          <h3>代理实例</h3>
          <button className="add-btn" onClick={onAdd}>
            + 添加
          </button>
        </div>
        <div className="instance-list">
          {instances.length === 0 ? (
            <div className="empty-state small">点击"添加"创建代理</div>
          ) : (
            instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                name={instance.name}
                status={instance.status}
                info={`${instance.listen} → ${instance.target}`}
                selected={selectedId === instance.id}
                onSelect={() => onSelect(instance.id)}
                onDelete={() => onDelete(instance.id)}
              />
            ))
          )}
        </div>
      </div>
      <div className="tab-content">
        {selectedInstance ? (
          <div className="proxy-detail">
            <div className="detail-section">
              <h3>{selectedInstance.name}</h3>
              <div className="form-row">
                <label>监听地址</label>
                <input
                  type="text"
                  value={selectedInstance.listen}
                  readOnly
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <label>目标地址</label>
                <input
                  type="text"
                  value={selectedInstance.target}
                  readOnly
                  className="form-input"
                />
              </div>
              <div className="button-row">
                {selectedInstance.status === 'running' ? (
                  <button className="btn-danger" onClick={() => onStop(selectedInstance.id)}>
                    停止
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => onStart(selectedInstance.id)}>
                    启动
                  </button>
                )}
              </div>
            </div>
            <div className="detail-section">
              <h3>连接列表 ({connections.length})</h3>
              <div className="connection-list">
                {connections.length === 0 ? (
                  <div className="empty-state small">暂无连接</div>
                ) : (
                  connections.map((conn) => (
                    <div key={conn.id} className="connection-item">
                      <span className="conn-source">{conn.source}</span>
                      <span className="conn-arrow">→</span>
                      <span className="conn-target">{conn.target}</span>
                      <span className="conn-stats">
                        {formatBytes(conn.bytesIn)}/{formatBytes(conn.bytesOut)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">选择或创建一个代理实例</div>
        )}
      </div>
    </div>
  );
}
