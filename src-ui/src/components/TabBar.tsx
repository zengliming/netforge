type TabType = 'proxy' | 'server' | 'client' | 'udp' | 'ws-server' | 'ws-client';
import './TabBar.css';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TABS: { key: TabType; label: string }[] = [
  { key: 'proxy', label: '代理' },
  { key: 'server', label: '服务端' },
  { key: 'client', label: '客户端' },
  { key: 'udp', label: 'UDP' },
  { key: 'ws-server', label: 'WS 服务端' },
  { key: 'ws-client', label: 'WS 客户端' },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
