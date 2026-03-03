import './EmptyState.css';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && (
        <button className="empty-state-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// 预设空状态组件
export function EmptyConnections() {
  return (
    <EmptyState
      icon="🔌"
      title="暂无连接"
      description="启动服务后将显示连接列表"
    />
  );
}

export function EmptyInstances() {
  return (
    <EmptyState
      icon="📦"
      title="暂无实例"
      description="点击上方按钮添加新实例"
    />
  );
}

export function EmptyData() {
  return (
    <EmptyState
      icon="📊"
      title="暂无数据"
      description="选择连接查看数据流"
    />
  );
}

export function EmptyLogs() {
  return (
    <EmptyState
      icon="📋"
      title="暂无日志"
      description="操作日志将显示在这里"
    />
  );
}
