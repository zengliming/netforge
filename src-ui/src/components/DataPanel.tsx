import { useState, useEffect, useRef } from 'react';
import type { Message, DataFormat } from '../types';
import './DataPanel.css';

interface DataPanelProps {
  messages: Message[];
  format: DataFormat;
  onFormatChange: (format: DataFormat) => void;
  onClear?: () => void;
  onResend?: (content: string) => void;
  onSend?: (message: string) => void;
  sendPlaceholder?: string;
  sendDisabled?: boolean;
  connectionStats?: {
    active: number;
    bytesUp: number;
    bytesDown: number;
    lastAddress?: string;
  };
  onFilterChange?: (pattern: string) => void;
}

export default function DataPanel({
  messages,
  format,
  onFormatChange,
  onClear,
  onResend,
  onSend,
  sendPlaceholder = '输入消息...',
  sendDisabled = false,
  connectionStats,
  onFilterChange,
}: DataPanelProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  const [sendValue, setSendValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && autoScroll && !isPaused) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll, isPaused]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false });
  };

  const filteredMessages = messages.filter(msg => 
    !filterValue || msg.content.toLowerCase().includes(filterValue.toLowerCase())
  );

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterValue(e.target.value);
    onFilterChange?.(e.target.value);
  };

  const handleSend = async () => {
    if (sendValue.trim() && !sendDisabled && !isSending && onSend) {
      setIsSending(true);
      try {
        onSend(sendValue.trim());
        setSendValue('');
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMessageIcon = (msg: Message): string => {
    if (msg.type === 'error') return '✕';
    if (msg.type === 'system') return '●';
    return msg.direction === 'in' ? '←' : '→';
  };

  return (
    <div className="data-panel">
      <div className="data-header">
        <span className="header-title">数据</span>
        <div className="format-tabs">
          {(['text', 'hex', 'json'] as DataFormat[]).map((f) => (
            <button
              key={f}
              className={`format-tab ${format === f ? 'active' : ''}`}
              onClick={() => onFormatChange(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="data-toolbar">
        <div 
          className={`auto-scroll-toggle ${autoScroll ? 'active' : ''}`}
          onClick={() => setAutoScroll(!autoScroll)}
        >
          <span className="toggle-dot">●</span>
          <span className="toggle-text">自动滚动</span>
        </div>
        <button 
          className="toolbar-btn"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? '▶' : '❚'}
        </button>
        <button className="toolbar-btn" onClick={onClear}>
          清空
        </button>
        <input
          type="text"
          className="filter-input"
          placeholder="过滤消息..."
          value={filterValue}
          onChange={handleFilterChange}
        />
      </div>

      <div className="data-content" ref={messagesContainerRef}>
        <div className="message-list">
          {filteredMessages.length === 0 ? (
            <div className="empty-state">暂无消息</div>
          ) : (
            filteredMessages.map((msg, index) => (
              <div
                key={`${msg.timestamp}-${index}`}
                className={`message-item ${msg.type} ${msg.direction || ''}`}
              >
                <span className="msg-time">[{formatTimestamp(msg.timestamp)}]</span>
                <span className="msg-icon">{getMessageIcon(msg)}</span>
                <span className="msg-content">{msg.content}</span>
                <span className="msg-bytes">{msg.content.length}B</span>
                {msg.direction === 'out' && onResend && (
                  <button 
                    className="resend-btn"
                    onClick={() => onResend(msg.content)}
                    title="resend"
                  >
                    ↻
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {connectionStats && (
          <div className="connection-stats">
            <span className="stat-active">连接: {connectionStats.active}</span>
            <span className="stat-dot">●</span>
            <span className="stat-bytes">
              ↑ {formatBytes(connectionStats.bytesUp)}  ↓ {formatBytes(connectionStats.bytesDown)}
            </span>
            {connectionStats.lastAddress && (
              <>
                <span className="stat-divider">|</span>
                <span className="stat-address">{connectionStats.lastAddress}</span>
              </>
            )}
          </div>
        )}
      </div>

      {onSend && (
        <div className="send-message-area">
          <span className="send-label">消息</span>
          <input
            type="text"
            className="send-input"
            placeholder={sendPlaceholder}
            value={sendValue}
            onChange={(e) => setSendValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendDisabled || isSending}
          />
          <button
            className={`send-btn ${isSending ? 'loading' : ''}`}
            onClick={handleSend}
            disabled={sendDisabled || !sendValue.trim() || isSending}
          >
            {isSending ? <span className="loading-spinner">◐</span> : '发送'}
          </button>
        </div>
      )}
    </div>
  );
}
