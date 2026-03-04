import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { UdpInstance, Message } from '../types';

export function useUdp() {
  // UDP state
  const [udpInstances, setUdpInstances] = useState<UdpInstance[]>([]);
  const [selectedUdpId, setSelectedUdpId] = useState<string | null>(null);
  const [udpMessages, setUdpMessages] = useState<Message[]>([]);
  
  // Utility function to generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log state
  const [logs, setLogs] = useState<{ message: string; timestamp: number }[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, { message, timestamp: Date.now() }].slice(-100));
  };
  
  // ========== UDP handlers ==========
  const handleAddUdp = () => {
    const newInstance: UdpInstance = {
      id: generateId(),
      name: `UDP ${udpInstances.length + 1}`,
      bindAddr: '127.0.0.1:9000',
      status: 'stopped',
    };
    setUdpInstances(prev => [...prev, newInstance]);
    setSelectedUdpId(newInstance.id);
  };

  const handleDeleteUdp = (id: string) => {
    setUdpInstances(prev => prev.filter(i => i.id !== id));
    if (selectedUdpId === id) setSelectedUdpId(null);
  };

  const handleUpdateUdp = (id: string, updates: Partial<UdpInstance>) => {
    setUdpInstances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleStartUdp = async (id: string) => {
    const instance = udpInstances.find(i => i.id === id);
    if (!instance) return;
    
    try {
      await invoke('start_udp', {
        instance_id: id,
        bind_addr: instance.bindAddr,
      });
      setUdpInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'running' } : i));
      addLog(`UDP 已启动: ${instance.bindAddr}`);
    } catch (e) {
      setUdpInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
      addLog(`UDP 启动失败: ${e}`);
    }
  };

  const handleStopUdp = async (id: string) => {
    try {
      await invoke('stop_udp', { instance_id: id });
      setUdpInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'stopped' } : i));
      addLog('UDP 已停止');
    } catch (e) {
      addLog(`停止 UDP 失败: ${e}`);
    }
  };

  const handleSendUdp = async (id: string, targetAddr: string, data: string) => {
    try {
      await invoke('send_udp', {
        instance_id: id,
        target_addr: targetAddr,
        data: data,
      });
      setUdpMessages(prev => [...prev, { direction: 'out', content: `[${targetAddr}] ${data}`, timestamp: Date.now() }]);
    } catch (e) {
      addLog(`发送 UDP 失败: ${e}`);
    }
  };

  return {
    // State
    udpInstances,
    selectedUdpId,
    udpMessages,
    logs,
    // Handlers
    handleAddUdp,
    handleDeleteUdp,
    handleUpdateUdp,
    handleStartUdp,
    handleStopUdp,
    handleSendUdp,
    // State setters
    setSelectedUdpId,
    setUdpMessages,
  };
}
