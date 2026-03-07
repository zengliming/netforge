import { invoke } from '@tauri-apps/api/core';
import { TabItem } from './ui';

type TabType = 'proxy' | 'server' | 'client' | 'udp' | 'ws-server' | 'ws-client';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  theme: string;
  toggleTheme: () => void;
}

const tabs: { key: TabType; label: string; icon: string }[] = [
  { key: 'proxy', label: '代理', icon: '⟳' },
  { key: 'server', label: '服务端', icon: '▣' },
  { key: 'client', label: '客户端', icon: '○' },
  { key: 'udp', label: 'UDP', icon: '◇' },
  { key: 'ws-server', label: 'WS 服务', icon: '◈' },
  { key: 'ws-client', label: 'WS 客户', icon: '◎' },
];

export default function Header({ activeTab, setActiveTab, theme, toggleTheme }: HeaderProps) {
  const handleExport = async () => {
    try {
      const config = await invoke('export_config');
      console.log('导出配置:', config);
      alert('配置已导出');
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = async () => {
    try {
      await invoke('import_config', { config: {} });
      alert('配置已导入');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="flex items-end h-14 px-6 bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-elevated)]">
      <div className="flex items-center h-10 mr-4">
        <h1 className="text-base font-semibold text-[var(--color-accent)] font-mono tracking-tight">
          ~ netforge
        </h1>
      </div>

      <nav className="flex items-end flex-1 h-full" role="tablist">
        {tabs.map((tab) => (
          <TabItem
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </nav>

      <div className="flex items-center gap-2 h-10 mb-0.5">
        <button
          onClick={handleExport}
          className="px-3 py-1.5 text-xs bg-transparent border border-[var(--color-bg-elevated)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] transition-all font-mono"
        >
          导出
        </button>
        <button
          onClick={handleImport}
          className="px-3 py-1.5 text-xs bg-transparent border border-[var(--color-bg-elevated)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] transition-all font-mono"
        >
          导入
        </button>
        <button
          onClick={toggleTheme}
          title="切换主题"
          className="w-8 h-8 flex items-center justify-center bg-transparent border border-[var(--color-bg-elevated)] rounded text-sm hover:border-[var(--color-text-muted)] transition-all"
        >
          {theme === 'dark' ? '◐' : '◑'}
        </button>
      </div>
    </header>
  );
}
