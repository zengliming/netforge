import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import Layout from './components/Layout';
import ProxyPanel from './components/ProxyPanel';
import ConnectionList from './components/ConnectionList';
import DataPanel from './components/DataPanel';
import ConfigPanel from './components/ConfigPanel';
import './App.css';

interface Connection {
  id: string;
  source: string;
  target: string;
  bytesIn: number;
  bytesOut: number;
  status: 'active' | 'closed';
}

interface ProxyStatus {
  status: 'Stopped' | 'Running';
  listen?: string;
  target?: string;
}

function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus>({ status: 'Stopped' });
  const [activeTab, setActiveTab] = useState<'proxy' | 'socket'>('proxy');
  const [logs, setLogs] = useState<string[]>(['NetForge GUI 已启动']);

  useEffect(() => {
    // 监听代理事件
    const unlistenConnection = listen<{ id: string; source: string; target: string; timestamp: number }>('proxy:connection', (event) => {
      const conn = event.payload;
      setConnections(prev => [...prev, {
        id: conn.id,
        source: conn.source,
        target: conn.target,
        bytesIn: 0,
        bytesOut: 0,
        status: 'active',
      }]);
      addLog(`新连接: ${conn.source} -> ${conn.target}`);
    });

    const unlistenData = listen<{ id: string; bytesFromClient: number; bytesFromServer: number }>('proxy:data', (event) => {
      const { id, bytesFromClient, bytesFromServer } = event.payload;
      setConnections(prev => prev.map(c => 
        c.id === id 
          ? { ...c, bytesIn: c.bytesIn + bytesFromClient, bytesOut: c.bytesOut + bytesFromServer }
          : c
      ));
    });

    const unlistenClosed = listen<{ id: string }>('proxy:closed', (event) => {
      const { id } = event.payload;
      setConnections(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'closed' } : c
      ));
      addLog(`连接关闭: ${id}`);
    });

    const unlistenStatus = listen<ProxyStatus>('proxy:status', (event) => {
      setProxyStatus(event.payload);
      addLog(`代理状态: ${event.payload.status}`);
    });

    return () => {
      unlistenConnection.then(fn => fn());
      unlistenData.then(fn => fn());
      unlistenClosed.then(fn => fn());
      unlistenStatus.then(fn => fn());
    };
  }, []);

  function addLog(message: string) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${message}`].slice(-100));
  }

  // selectedConnection removed

  return (
    <Layout>
      <div className="layout-left">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'proxy' ? 'active' : ''}`}
            onClick={() => setActiveTab('proxy')}
          >
            代理
          </button>
          <button 
            className={`tab ${activeTab === 'socket' ? 'active' : ''}`}
            onClick={() => setActiveTab('socket')}
          >
            Socket
          </button>
        </div>
        {activeTab === 'proxy' ? (
          <ConnectionList 
            connections={connections} 
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <div className="panel-placeholder">
            <p className="text-muted text-sm">Socket 调试功能</p>
          </div>
        )}
      </div>
      
      <div className="layout-center">
        <DataPanel 
          data={[]} 
          format="hex"
          onFormatChange={() => {}}
        />
      </div>
      
      <div className="layout-right">
        {activeTab === 'proxy' ? (
          <ProxyPanel />
        ) : (
          <ConfigPanel />
        )}
      </div>
      
      <div className="layout-bottom">
        <div className="log-area">
          <div className="log-content">
            {logs.map((log, i) => (
              <p key={i} className="log-entry text-xs font-mono text-muted">{log}</p>
            ))}
          </div>
        </div>
        <div className="status-bar">
          <span className={`status-indicator ${proxyStatus.status === 'Running' ? 'status-active' : 'status-inactive'}`}>
            {proxyStatus.status === 'Running' ? '●' : '○'}
          </span>
          <span className="text-xs text-muted">
            {proxyStatus.status === 'Running' ? `${proxyStatus.listen} -> ${proxyStatus.target}` : '未启动'}
          </span>
          <span className="spacer"></span>
          <span className="text-xs text-muted">v0.1.0</span>
        </div>
      </div>
    </Layout>
  );
}

export default App;
