import type { InstanceStatus } from '../types';
import './InstanceCard.css';

interface InstanceCardProps {
  name: string;
  status: InstanceStatus;
  info: string;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const statusColors = {
  running: {
    bg: 'var(--status-running-bg)',
    border: 'var(--status-running-border)',
    text: 'var(--status-running-text)',
    glow: '0 0 8px rgba(16, 185, 129, 0.5)',
  },
  stopped: {
    bg: 'var(--status-stopped-bg)',
    border: 'var(--status-stopped-border)',
    text: 'var(--status-stopped-text)',
    glow: '',
  },
  error: {
    bg: 'var(--status-error-bg)',
    border: 'var(--status-error-border)',
    text: 'var(--status-error-text)',
    glow: '0 0 8px rgba(239, 68, 68, 0.5)',
  },
};

export default function InstanceCard({
  name,
  status,
  info,
  selected,
  onSelect,
  onDelete,
}: InstanceCardProps) {
  const colors = statusColors[status] || statusColors.stopped;

  return (
    <div
      className={`instance-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      style={{
        borderColor: selected ? colors.border : undefined,
        boxShadow: selected ? colors.glow : 'none',
      }}
    >
      {/* Delete button - top right */}
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="删除"
      >
        ×
      </button>

      {/* Header row: status dot + name */}
      <div className="instance-header">
        <div
          className="status-dot"
          style={{
            backgroundColor: colors.border,
            boxShadow: status === 'running' ? colors.glow : 'none',
          }}
        />
        <span className="instance-name">{name}</span>
      </div>

      {/* Status text */}
      <div className="instance-status" style={{ color: colors.text }}>
        {status === 'running' ? '运行中' : status === 'error' ? '错误' : '已停止'}
      </div>

      {/* Info line */}
      <div className="instance-info">{info}</div>
    </div>
  );
}
