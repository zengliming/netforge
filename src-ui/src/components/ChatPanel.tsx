import { useState, useEffect, useRef } from 'react';
import type { Message, DataFormat } from '../types';
import './ChatPanel.css';

interface ChatPanelProps {
  messages: Message[];
  onSend: (message: string) => void;
  format: DataFormat;
  onFormatChange: (format: DataFormat) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatPanel({
  messages,
  onSend,
  format,
  onFormatChange,
  placeholder = '输入消息...',
  disabled = false,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatContent = (content: string, fmt: DataFormat): string => {
    if (fmt === 'hex') {
      try {
        const bytes = new TextEncoder().encode(content);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
      } catch {
        return content;
      }
    }
    return content;
  };

  return (
    <div className="chat-panel">
      <div className="chat-toolbar">
        <div className="format-tabs">
          {(['text', 'hex', 'json'] as DataFormat[]).map((f) => (
            <button
              key={f}
              className={`format-tab ${format === f ? 'active' : ''}`}
              onClick={() => onFormatChange(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">暂无消息</div>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.timestamp}-${index}`} className={`chat-message ${msg.direction}`}>
              <span className="msg-time">
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
              </span>
              <span className="msg-direction">{msg.direction === 'in' ? '←' : '→'}</span>
              <pre className="msg-content">
                {format === 'hex' ? formatContent(msg.content, 'hex') : msg.content}
              </pre>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
