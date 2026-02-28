import type { ServerInstance, Message, DataFormat } from '../types';
import InstanceCard from './InstanceCard';
import ChatPanel from './ChatPanel';
import './ProxyTab.css';

interface ServerTabProps {
  instances: ServerInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ServerInstance>) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  messages: Message[];
  onSendMessage: (message: string, targetClient?: string) => void;
  format: DataFormat;
  onFormatChange: (format: DataFormat) => void;
  clients: string[];
  selectedClient: string | null;
  onSelectClient: (client: string) => void;
}

export default function ServerTab({
  instances,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onUpdate,
  onStart,
  onStop,
  messages,
  onSendMessage,
  format,
  onFormatChange,
  clients,
  selectedClient,
  onSelectClient,
}: ServerTabProps) {
  const selectedInstance = instances.find((i) => i.id === selectedId);

  return (
    <div className="tab-container">
      <div className="tab-sidebar">
        <div className="sidebar-header">
          <h3>服务端实例</h3>
          <button className="add-btn" onClick={onAdd}>
            + 添加
          </button>
        </div>
        <div className="instance-list">
          {instances.length === 0 ? (
            <div className="empty-state small">点击"添加"创建服务端</div>
          ) : (
            instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                name={instance.name}
                status={instance.status}
                info={instance.listen}
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
          <div className="server-detail">
            <div className="detail-section">
              <h3>{selectedInstance.name}</h3>
              <div className="form-row">
                <label>监听地址</label>
                <input
                  type="text"
                  value={selectedInstance.listen}
                  onChange={(e) => onUpdate(selectedInstance.id, { listen: e.target.value })}
                  disabled={selectedInstance.status === 'running'}
                  className="form-input"
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
            
            {selectedInstance.status === 'running' && (
              <div className="detail-section">
                <h3>已连接客户端 ({clients.length})</h3>
                <div className="client-list">
                  {clients.length === 0 ? (
                    <div className="empty-state small">等待客户端连接...</div>
                  ) : (
                    clients.map((client) => (
                      <div
                        key={client}
                        className={`client-item ${selectedClient === client ? 'selected' : ''}`}
                        onClick={() => onSelectClient(client)}
                      >
                        {client}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            <div className="detail-section chat-section">
              <h3>消息</h3>
              <ChatPanel
                messages={messages}
                onSend={(msg) => onSendMessage(msg, selectedClient || undefined)}
                format={format}
                onFormatChange={onFormatChange}
                disabled={selectedInstance.status !== 'running' || !selectedClient}
                placeholder={selectedClient ? `发送到 ${selectedClient}` : '选择一个客户端发送消息'}
              />
            </div>
          </div>
        ) : (
          <div className="empty-state">选择或创建一个服务端实例</div>
        )}
      </div>
    </div>
  );
}
