import { useState } from 'react';
import './DataPanel.css';

type DataFormat = 'hex' | 'text' | 'json';

interface DataEntry {
  id: string;
  direction: 'in' | 'out';
  data: Uint8Array;
  timestamp: number;
}

interface DataPanelProps {
  data: DataEntry[];
  format: DataFormat;
  onFormatChange?: (format: DataFormat) => void;
}

export default function DataPanel({ data, format, onFormatChange }: DataPanelProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [paused, setPaused] = useState(false);

  return (
    <div className="data-panel">
      <div className="data-toolbar">
        <div className="tabs">
          {(['hex', 'text', 'json'] as DataFormat[]).map((f) => (
            <button
              key={f}
              className={`tab ${format === f ? 'active' : ''}`}
              onClick={() => onFormatChange?.(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span className="text-xs">自动滚动</span>
          </label>
          <button
            className={`btn-icon ${paused ? 'active' : ''}`}
            onClick={() => setPaused(!paused)}
            title={paused ? '继续' : '暂停'}
          >
            {paused ? '▶' : '⏸'}
          </button>
        </div>
      </div>
      <div className="data-content">
        {data.length === 0 ? (
          <div className="data-empty">
            <p className="text-muted text-sm">选择连接查看数据</p>
          </div>
        ) : (
          <pre className="data-text">
            {data.map((entry) => (
              <div key={entry.id} className={`data-entry ${entry.direction}`}>
                <span className="entry-direction">{entry.direction === 'in' ? '←' : '→'}</span>
                <span className="entry-data">{formatData(entry.data, format)}</span>
              </div>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}

function formatData(data: Uint8Array, format: DataFormat): string {
  switch (format) {
    case 'hex':
      return Array.from(data)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')
        .slice(0, 256) + (data.length > 256 ? '...' : '');
    case 'text':
      return new TextDecoder()
        .decode(data)
        .slice(0, 256) + (data.length > 256 ? '...' : '');
    case 'json':
      try {
        return JSON.stringify(JSON.parse(new TextDecoder().decode(data)), null, 2).slice(0, 512);
      } catch {
        return new TextDecoder().decode(data).slice(0, 256);
      }
    default:
      return '';
  }
}
