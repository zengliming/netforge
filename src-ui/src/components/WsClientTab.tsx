import type { WsClientInstance, Message, DataFormat } from '../types';
import InstanceCard from './InstanceCard';
import ChatPanel from './ChatPanel';
import './ProxyTab.css';

interface WsClientTabProps {
  instances: WsClientInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WsClientInstance>) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  messages: Message[];
  onSendMessage: (message: string) => void;
  format: DataFormat;
  onFormatChange: (format: DataFormat) => void;
}

export default function WsClientTab({
  instances,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onUpdate,
  onConnect,
  onDisconnect,
  messages,
  onSendMessage,
  format,
  onFormatChange,
}: WsClientTabProps) {
  const selectedInstance = instances.find((i) => i.id === selectedId);

  return (
    <div className="tab-container">
      <div className="tab-sidebar">
        <div className="sidebar-header">
          <h3>WebSocket 客户端</h3>
          <button className="add-btn" onClick={onAdd}>
            + 添加
          </button>
        </div>
        <div className="instance-list">
          {instances.length === 0 ? (
            <div className="empty-state small">点击"添加"创建客户端</div>
          ) : (
            instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                name={instance.name}
                status={instance.status}
                info={instance.serverUrl}
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
          <div className="client-detail">
            <div className="detail-section">
              <h3>{selectedInstance.name}</h3>
              <div className="form-row">
                <label>服务器地址</label>
                <input
                  type="text"
                  value={selectedInstance.serverUrl}
                  onChange={(e) => onUpdate(selectedInstance.id, { serverUrl: e.target.value })}
                  disabled={selectedInstance.status === 'running'}
                  className="form-input"
                  placeholder="ws://127.0.0.1:8080"
                />
              </div>
              <div className="form-row">
                <label>数据格式</label>
                <select
                  value={format}
                  onChange={(e) => onFormatChange(e.target.value as DataFormat)}
                  disabled={selectedInstance.status === 'running'}
                  className="form-input"
                >
                  <option value="text">Text</option>
                  <option value="hex">Hex</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="button-row">
                {selectedInstance.status === 'running' ? (
                  <button className="btn-danger" onClick={() => onDisconnect(selectedInstance.id)}>
                    断开
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => onConnect(selectedInstance.id)}>
                    连接
                  </button>
                )}
              </div>
            </div>
            <div className="detail-section chat-section">
              <h3>消息</h3>
              <ChatPanel
                messages={messages}
                onSend={onSendMessage}
                format={format}
                onFormatChange={onFormatChange}
                disabled={selectedInstance.status !== 'running'}
                placeholder="输入消息发送到服务器..."
              />
            </div>
          </div>
        ) : (
          <div className="empty-state">选择或创建一个 WebSocket 客户端</div>
        )}
      </div>
    </div>
  );
}
