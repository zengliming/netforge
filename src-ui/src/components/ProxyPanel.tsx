import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
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

  const loadStatus = useCallback(async () => {
    try {
      const s = await invoke<ProxyStatus>('get_proxy_status');
      setStatus(s);
    } catch (e) {
      console.error('Failed to load status:', e);
    }
  }, []);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setupListeners = async () => {
      const unlistenStatus = await listen<ProxyStatus>('proxy:status', (event) => {
        setStatus(event.payload);
      });
      unlisteners.push(unlistenStatus);

      const unlistenConnection = await listen('proxy:connection', () => {
        setStats(prev => ({ ...prev, connections: prev.connections + 1 }));
      });
      unlisteners.push(unlistenConnection);

      const unlistenData = await listen<{ bytesFromClient: number; bytesFromServer: number }>('proxy:data', (event) => {
        setStats(prev => ({
          ...prev,
          bytesIn: prev.bytesIn + event.payload.bytesFromClient,
          bytesOut: prev.bytesOut + event.payload.bytesFromServer,
        }));
      });
      unlisteners.push(unlistenData);
    };

    setupListeners();

    return () => {
      unlisteners.forEach(unlisten => unlisten());
    };
  }, []);

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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useTls}
              onChange={(e) => setUseTls(e.target.checked)}
              disabled={isRunning}
            />
            <span>启用 TLS</span>
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
                placeholder="/path/to/cert.pem"
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
                placeholder="/path/to/key.pem"
                disabled={isRunning}
                className="w-full"
              />
            </div>
          </>
        )}
        <div className="form-actions">
          {!isRunning ? (
            <button onClick={handleStart} className="btn-primary">
              启动代理
            </button>
          ) : (
            <button onClick={handleStop} className="btn-danger">
              停止代理
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="proxy-stats">
        <div className="stat-item">
          <span className="stat-label">状态</span>
          <span className={`stat-value ${isRunning ? 'running' : 'stopped'}`}>
            {status.status}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">连接数</span>
          <span className="stat-value">{stats.connections}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">入站流量</span>
          <span className="stat-value">{formatBytes(stats.bytesIn)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">出站流量</span>
          <span className="stat-value">{formatBytes(stats.bytesOut)}</span>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
