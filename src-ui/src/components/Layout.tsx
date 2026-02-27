import { useState, type ReactNode } from 'react';
import './Layout.css';

interface LayoutProps {}

interface PanelProps {
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
}

function Panel({ title, collapsible = true, defaultExpanded = true, children, className = '' }: PanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`panel ${className} ${!expanded ? 'collapsed' : ''}`}>
      {(collapsible || title) && (
        <div className="panel-header" onClick={() => collapsible && setExpanded(!expanded)}>
          <span className="panel-title">{title}</span>
          {collapsible && (
            <span className="panel-toggle">{expanded ? '▼' : '▶'}</span>
          )}
        </div>
      )}
      {expanded && <div className="panel-content">{children}</div>}
    </div>
  );
}

export default function Layout(_props: LayoutProps) {
  return (
    <div className="layout">
      <div className="layout-main">
        <div className="layout-left">
          <Panel title="连接列表" collapsible={true} defaultExpanded={true}>
            <div className="panel-placeholder">
              <p className="text-muted text-sm">暂无连接</p>
            </div>
          </Panel>
        </div>
        <div className="layout-center">
          <Panel title="数据面板" collapsible={false} defaultExpanded={true}>
            <div className="tab-content">
              <div className="tabs">
                <button className="tab active">Hex</button>
                <button className="tab">Text</button>
                <button className="tab">JSON</button>
              </div>
              <div className="data-view">
                <p className="text-muted text-sm">选择连接查看数据</p>
              </div>
            </div>
          </Panel>
        </div>
        <div className="layout-right">
          <Panel title="详情" collapsible={true} defaultExpanded={false}>
            <div className="panel-placeholder">
              <p className="text-muted text-sm">选择连接查看详情</p>
            </div>
          </Panel>
          <Panel title="配置" collapsible={true} defaultExpanded={true}>
            <div className="config-form">
              <div className="form-group">
                <label className="text-sm">监听地址</label>
                <input type="text" placeholder="127.0.0.1:8080" className="w-full" />
              </div>
              <div className="form-group">
                <label className="text-sm">目标地址</label>
                <input type="text" placeholder="127.0.0.1:9000" className="w-full" />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span className="text-sm">启用 TLS</span>
                </label>
              </div>
            </div>
          </Panel>
        </div>
      </div>
      <div className="layout-bottom">
        <div className="log-area">
          <div className="log-header">
            <span className="text-sm font-mono">日志</span>
          </div>
          <div className="log-content">
            <p className="log-entry text-xs font-mono text-muted">
              <span className="timestamp">[14:00:00]</span> NetForge GUI 已启动
            </p>
          </div>
        </div>
        <div className="status-bar">
          <span className="status-indicator status-inactive">●</span>
          <span className="text-xs text-muted">未连接</span>
          <span className="spacer"></span>
          <span className="text-xs text-muted">v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
