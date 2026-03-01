import { useState } from 'react';
import type { UdpInstance, Message, DataFormat } from '../types';
import InstanceCard from './InstanceCard';
import ChatPanel from './ChatPanel';
import './ProxyTab.css';

interface UdpTabProps {
  instances: UdpInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<UdpInstance>) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onSend: (id: string, targetAddr: string, data: string) => void;
  messages: Message[];
  format: DataFormat;
  onFormatChange: (format: DataFormat) => void;
}

export default function UdpTab({
  instances,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onUpdate,
  onStart,
  onStop,
  onSend,
  messages,
  format,
  onFormatChange,
}: UdpTabProps) {
  const selectedInstance = instances.find((i) => i.id === selectedId);
  const [targetAddr, setTargetAddr] = useState('');

  const handleSend = () => {
    if (selectedInstance && targetAddr.trim() && selectedInstance.status === 'running') {
      onSend(selectedInstance.id, targetAddr.trim(), '');
      setTargetAddr('');
    }
  };

  return (
    <div className="tab-container">
      <div className="tab-sidebar">
        <div className="sidebar-header">
          <h3>UDP 实例</h3>
          <button className="add-btn" onClick={onAdd}>
            + 添加
          </button>
        </div>
        <div className="instance-list">
          {instances.length === 0 ? (
            <div className="empty-state small">点击"添加"创建 UDP 实例</div>
          ) : (
            instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                name={instance.name}
                status={instance.status}
                info={instance.bindAddr}
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
          <div className="udp-detail">
            <div className="detail-section">
              <h3>{selectedInstance.name}</h3>
              <div className="form-row">
                <label>绑定地址</label>
                <input
                  type="text"
                  value={selectedInstance.bindAddr}
                  onChange={(e) => onUpdate(selectedInstance.id, { bindAddr: e.target.value })}
                  disabled={selectedInstance.status === 'running'}
                  className="form-input"
                  placeholder="127.0.0.1:9000"
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
                <h3>发送数据</h3>
                <div className="form-row">
                  <label>目标地址</label>
                  <input
                    type="text"
                    value={targetAddr}
                    onChange={(e) => setTargetAddr(e.target.value)}
                    className="form-input"
                    placeholder="127.0.0.1:9001"
                  />
                </div>
                <div className="udp-send-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="输入要发送的数据..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && targetAddr.trim()) {
                        handleSend();
                      }
                    }}
                    disabled={selectedInstance.status !== 'running'}
                  />
                  <button
                    className="btn-primary"
                    onClick={handleSend}
                    disabled={selectedInstance.status !== 'running' || !targetAddr.trim()}
                  >
                    发送
                  </button>
                </div>
              </div>
            )}

            <div className="detail-section chat-section">
              <h3>消息</h3>
              <ChatPanel
                messages={messages}
                onSend={() => {}}
                format={format}
                onFormatChange={onFormatChange}
                disabled={true}
                placeholder="UDP 消息自动显示"
              />
            </div>
          </div>
        ) : (
          <div className="empty-state">选择或创建一个 UDP 实例</div>
        )}
      </div>
    </div>
  );
}
