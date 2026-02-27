import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './ProxyPanel.css';

interface ProxyStatus {
  status: 'Stopped' | 'Running';
  listen?: string;
  target?: string;
}

interface ProxyStats {
  connections: number;
  bytesIn: number;
  bytesOut: number;
}

export default function ProxyPanel() {
  const [listenAddr, setListenAddr] = useState('127.0.0.1:8080');
  const [targetAddr, setTargetAddr] = useState('127.0.0.1:9000');
  const [useTls, setUseTls] = useState(false);
  const [certPath, setCertPath] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [status, setStatus] = useState<ProxyStatus>({ status: 'Stopped' });
  const [stats, setStats] = useState<ProxyStats>({ connections: 0, bytesIn: 0, bytesOut: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 加载初始状态
    loadStatus();

    // 监听代理事件
    const unlistenStatus = listen<ProxyStatus>('proxy:status', (event) => {
      setStatus(event.payload);
    });

    const unlistenConnection = listen('proxy:connection', () => {
      setStats(prev => ({ ...prev, connections: prev.connections + 1 }));
    });

    const unlistenData = listen<{ bytesFromClient: number; bytesFromServer: number }>('proxy:data', (event) => {
      setStats(prev => ({
        ...prev,
        bytesIn: prev.bytesIn + event.payload.bytesFromClient,
        bytesOut: prev.bytesOut + event.payload.bytesFromServer,
      }));
    });

    return () => {
      unlistenStatus.then(fn => fn());
      unlistenConnection.then(fn => fn());
      unlistenData.then(fn => fn());
    };
  }, []);

  async function loadStatus() {
    try {
      const s = await invoke<ProxyStatus>('get_proxy_status');
      setStatus(s);
    } catch (e) {
      console.error('Failed to load status:', e);
    }
  }

  async function handleStart() {
    setError(null);
    try {
      await invoke('start_proxy', {
        listen: listenAddr,
        target: targetAddr,
        tls: useTls,
        cert: useTls ? certPath : null,
        key: useTls ? keyPath : null,
      });
      await loadStatus();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleStop() {
    setError(null);
    try {
      await invoke('stop_proxy');
      await loadStatus();
    } catch (e) {
      setError(String(e));
    }
  }

  const isRunning = status.status === 'Running';

  return (
    <div className="proxy-panel">
      <div className="proxy-form">
        <div className="form-group">
          <label className="text-sm">监听地址</label>
          <input
            type="text"
            value={listenAddr}
            onChange={(e) => setListenAddr(e.target.value)}
            placeholder="127.0.0.1:8080"
            disabled={isRunning}
            className="w-full"
          />
        </div>
        <div className="form-group">
          <label className="text-sm">目标地址</label>
          <input
            type="text"
            value={targetAddr}
            onChange={(e) => setTargetAddr(e.target.value)}
            placeholder="127.0.0.1:9000"
            disabled={isRunning}
            className="w-full"
          />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useTls}
              onChange={(e) => setUseTls(e.target.checked)}
              disabled={isRunning}
            />
            <span className="text-sm">启用 TLS</span>
          </label>
        </div>
        {useTls && (
          <>
            <div className="form-group">
              <label className="text-sm">证书路径</label>
              <input
                type="text"
                value={certPath}
                onChange={(e) => setCertPath(e.target.value)}
                placeholder="./certs/server.crt"
                disabled={isRunning}
                className="w-full"
              />
            </div>
            <div className="form-group">
              <label className="text-sm">私钥路径</label>
              <input
                type="text"
                value={keyPath}
                onChange={(e) => setKeyPath(e.target.value)}
                placeholder="./certs/server.key"
                disabled={isRunning}
                className="w-full"
              />
            </div>
          </>
        )}
        <div className="button-group">
          {!isRunning ? (
            <button onClick={handleStart} className="btn-primary">
              启动
            </button>
          ) : (
            <button onClick={handleStop} className="btn-danger">
              停止
            </button>
          )}
        </div>
        {error && <div className="error-message text-sm">{error}</div>}
      </div>
      <div className="proxy-status">
        <div className="status-row">
          <span className="text-sm text-muted">状态</span>
          <span className={`status-badge ${isRunning ? 'status-active' : 'status-inactive'}`}>
            {isRunning ? '运行中' : '已停止'}
          </span>
        </div>
        {isRunning && status.listen && status.target && (
          <div className="status-row">
            <span className="text-sm text-muted">转发</span>
            <span className="text-sm">{status.listen} → {status.target}</span>
          </div>
        )}
        <div className="status-row">
          <span className="text-sm text-muted">连接数</span>
          <span className="text-sm">{stats.connections}</span>
        </div>
        <div className="status-row">
          <span className="text-sm text-muted">入站</span>
          <span className="text-sm font-mono">{formatBytes(stats.bytesIn)}</span>
        </div>
        <div className="status-row">
          <span className="text-sm text-muted">出站</span>
          <span className="text-sm font-mono">{formatBytes(stats.bytesOut)}</span>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
