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

export default function InstanceCard({
  name,
  status,
  info,
  selected,
  onSelect,
  onDelete,
}: InstanceCardProps) {
  const statusColor = {
    running: 'var(--status-active)',
    stopped: 'var(--status-inactive)',
    error: 'var(--status-error)',
  };

  return (
    <div
      className={`instance-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="instance-header">
        <span className="status-dot" style={{ backgroundColor: statusColor[status] }}>
          {status === 'running' ? '●' : '○'}
        </span>
        <span className="instance-name">{name}</span>
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
      </div>
      <div className="instance-info">{info}</div>
    </div>
  );
}
