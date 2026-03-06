import { invoke } from '@tauri-apps/api/core';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  theme: string;
  toggleTheme: () => void;
}

export default function Header({ activeTab, setActiveTab, theme, toggleTheme }: HeaderProps) {
  return (
    <div className="app-header">
      <h1 className="app-title">NetForge</h1>
      <div className="main-tabs">
        <button
          className={`main-tab ${activeTab === 'proxy' ? 'active' : ''}`}
          onClick={() => setActiveTab('proxy')}
        >
          代理
        </button>
        <button
          className={`main-tab ${activeTab === 'server' ? 'active' : ''}`}
          onClick={() => setActiveTab('server')}
        >
          服务端
        </button>
        <button
          className={`main-tab ${activeTab === 'client' ? 'active' : ''}`}
          onClick={() => setActiveTab('client')}
        >
          客户端
        </button>
        <button
          className={`main-tab ${activeTab === 'udp' ? 'active' : ''}`}
          onClick={() => setActiveTab('udp')}
        >
          UDP
        </button>
        <button
          className={`main-tab ${activeTab === 'ws-server' ? 'active' : ''}`}
          onClick={() => setActiveTab('ws-server')}
        >
          WS 服务端
        </button>
        <button
          className={`main-tab ${activeTab === 'ws-client' ? 'active' : ''}`}
          onClick={() => setActiveTab('ws-client')}
        >
          WS 客户端
        </button>
      </div>
      <div className="header-actions">
        <button className="config-btn" onClick={async () => {
          try {
            const config = await invoke('export_config');
            console.log('导出配置:', config);
            alert('配置已导出');
          } catch (e) { console.error(e); }
        }}>导出</button>
        <button className="config-btn" onClick={async () => {
          try {
            await invoke('import_config', { config: {} });
            alert('配置已导入');
          } catch (e) { console.error(e); }
        }}>导入</button>
        <button className="theme-toggle" onClick={toggleTheme} title="切换主题">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}
