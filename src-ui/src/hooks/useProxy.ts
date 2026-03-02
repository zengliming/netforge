import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ProxyInstance, Connection } from '../types';

export function useProxy() {
  // Proxy state
  const [proxyInstances, setProxyInstances] = useState<ProxyInstance[]>([]);
  const [selectedProxyId, setSelectedProxyId] = useState<string | null>(null);
  const [proxyConnections, setProxyConnections] = useState<Connection[]>([]);

  // Utility function to generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log state (used by handlers)
  const [logs, setLogs] = useState<{ message: string; timestamp: number }[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, { message, timestamp: Date.now() }].slice(-100));
  };

  // ========== Proxy handlers ==========
  const handleAddProxy = () => {
    const newInstance: ProxyInstance = {
      id: generateId(),
      name: `代理 ${proxyInstances.length + 1}`,
      listen: '127.0.0.1:8080',
      target: '127.0.0.1:9000',
      status: 'stopped',
    };
    setProxyInstances(prev => [...prev, newInstance]);
    setSelectedProxyId(newInstance.id);
  };

  const handleDeleteProxy = (id: string) => {
    setProxyInstances(prev => prev.filter(i => i.id !== id));
    if (selectedProxyId === id) setSelectedProxyId(null);
  };

  const handleUpdateProxy = (id: string, updates: Partial<ProxyInstance>) => {
    setProxyInstances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleStartProxy = async (id: string) => {
    const instance = proxyInstances.find(i => i.id === id);
    if (!instance) return;

    try {
      await invoke('start_proxy', {
        instance_id: id,
        listen: instance.listen,
        target: instance.target,
        tls: false,
        cert: null,
        key: null,
      });
      setProxyInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running' } : i));
      addLog(`代理已启动: ${instance.listen} -> ${instance.target}`);
    } catch (e) {
      setProxyInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      addLog(`代理启动失败: ${e}`);
    }
  };

  const handleStopProxy = async (id: string) => {
    try {
      await invoke('stop_proxy', { instance_id: id });
      setProxyInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' } : i));
      setProxyConnections([]);
      addLog('代理已停止');
    } catch (e) {
      addLog(`停止代理失败: ${e}`);
    }
  };

  return {
    // State
    proxyInstances,
    selectedProxyId,
    proxyConnections,
    logs,
    // Handlers
    handleAddProxy,
    handleDeleteProxy,
    handleUpdateProxy,
    handleStartProxy,
    handleStopProxy,
    // State setters
    setProxyInstances,
    setSelectedProxyId,
    setProxyConnections,
  };
}
