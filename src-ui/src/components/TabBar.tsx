import { useRef, useEffect, useState } from 'react';
import './TabBar.css';

type TabType = 'proxy' | 'server' | 'client' | 'udp' | 'ws-server' | 'ws-client';

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
  const barRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!barRef.current) return;
    const activeIndex = TABS.findIndex((t) => t.key === activeTab);
    const buttons = barRef.current.querySelectorAll('.tab-button');
    const activeBtn = buttons[activeIndex] as HTMLElement;
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <div className="tab-bar" ref={barRef}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
      <div
        className="tab-indicator"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
    </div>
  );
}
